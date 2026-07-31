import type { GenericMutationCtx } from "convex/server";
import { ConvexError } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";

export const EXERCISE_BANNER =
  "EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY";

export type CanonicalRole = "field" | "control" | "director";

export const roleDefinitions = {
  field: {
    displayName: "Field Engineer",
    publicAlias: "FE-1",
    channel: "telegram",
  },
  control: {
    displayName: "Mission Control",
    publicAlias: "MC-1",
    channel: "discord",
  },
  director: {
    displayName: "Operations Director",
    publicAlias: "OD-1",
    channel: "email",
  },
} as const;

export const injectDefinitions = {
  F1: {
    role: "field",
    text: `${EXERCISE_BANNER}\n\nPressure is rising in Bay 3. Local sensor confidence: 71%. Choose: SEAL BAY 3, INSPECT, or WAIT.`,
    allowed: ["SEAL_BAY_3", "INSPECT", "WAIT"],
    prerequisites: [],
  },
  C1: {
    role: "control",
    text: `${EXERCISE_BANNER}\n\nLast synchronized map shows Bay 3 passable. Crew 7 needs the shortest route to the cooling manifold. Choose: ROUTE BAY 3 or ROUTE BAY 5.`,
    allowed: ["ROUTE_BAY_3", "ROUTE_BAY_5"],
    prerequisites: ["F1"],
    faultType: "stale_fact",
  },
  D1: {
    role: "director",
    subject:
      "[EXERCISE] Asteria Station pressure anomaly — escalation decision",
    text: `${EXERCISE_BANNER}\n\nA pressure anomaly has been reported in Bay 3. Confirmation remains incomplete. Decide: NOTIFY COMMANDER or WAIT FOR CONFIRMATION.`,
    allowed: ["NOTIFY_COMMANDER", "WAIT_FOR_CONFIRMATION"],
    prerequisites: [],
    faultType: "omission",
  },
  RF1: {
    role: "field",
    text: `${EXERCISE_BANNER}\n\nMission Control is routing Crew 7 through Bay 3. Confirm: PASSAGE BLOCKED or PASSAGE AVAILABLE.`,
    allowed: ["PASSAGE_BLOCKED", "PASSAGE_AVAILABLE"],
    prerequisites: ["C-BAY3"],
    faultType: "conflict",
  },
  RC1: {
    role: "control",
    text: `${EXERCISE_BANNER}\n\nField reports Bay 3 sealed, which conflicts with your Crew 7 route. Choose: REROUTE BAY 5 or REQUEST OVERRIDE.`,
    allowed: ["REROUTE_BAY_5", "REQUEST_OVERRIDE"],
    prerequisites: ["C-BAY3"],
    faultType: "conflict",
  },
  RD1: {
    role: "director",
    subject: "[EXERCISE] Coordination fault detected — escalation required",
    text: `${EXERCISE_BANNER}\n\nCrew 7 is routed through Bay 3 while Field reports it sealed. Choose: ESCALATE NOW or HOLD.`,
    allowed: ["ESCALATE_NOW", "HOLD"],
    prerequisites: ["C-BAY3", "D1"],
    faultType: "escalation_delay",
  },
} as const;

export const injectKnowledgeDefinitions = {
  F1: [
    { factKey: "bay3.pressureTrend", version: 1, stale: false },
    { factKey: "bay3.sensorConfidence", version: 1, stale: false },
  ],
  C1: [
    { factKey: "bay3.access", version: 1, stale: true },
    { factKey: "bay5.access", version: 1, stale: false },
    { factKey: "crew7.location", version: 1, stale: false },
  ],
  D1: [
    { factKey: "bay3.pressureTrend", version: 1, stale: false },
    { factKey: "incident.escalation", version: 1, stale: false },
  ],
  RF1: [{ factKey: "crew7.route", stale: false }],
  RC1: [
    { factKey: "bay3.access", stale: false },
    { factKey: "crew7.route", stale: false },
  ],
  RD1: [
    { factKey: "bay3.access", stale: false },
    { factKey: "crew7.route", stale: false },
  ],
} as const;

export const injectDeadlineMs = {
  F1: 120_000,
  C1: 120_000,
  D1: 180_000,
  RF1: 120_000,
  RC1: 120_000,
  RD1: 180_000,
} as const;

export function deadlineForInject(injectKey: string): number {
  return injectKey in injectDeadlineMs
    ? injectDeadlineMs[injectKey as keyof typeof injectDeadlineMs]
    : 120_000;
}

export function blocksForInject(input: {
  injectKey: string;
  exerciseText: string;
  emailSubject?: string;
  allowedDecisions: string[];
}) {
  return [
    { type: "text", text: EXERCISE_BANNER },
    {
      type: "heading",
      text: input.emailSubject ?? `Asteria Station · ${input.injectKey}`,
    },
    {
      type: "text",
      text: input.exerciseText.slice(EXERCISE_BANNER.length).trim(),
    },
    {
      type: "buttons",
      buttons: input.allowedDecisions.map((decision) => ({
        label: decision.replaceAll("_", " "),
        value: `decision:${decision}`,
      })),
    },
  ];
}

export async function queueScenarioInject(
  ctx: GenericMutationCtx<DataModel>,
  sessionId: Id<"sessions">,
  injectKey: string,
  now: number,
): Promise<boolean> {
  const inject = await ctx.db
    .query("injects")
    .withIndex("by_session_inject_key", (q) =>
      q.eq("sessionId", sessionId).eq("injectKey", injectKey),
    )
    .unique();
  if (inject === null || inject.status !== "planned") return false;
  const [role, endpoint] = await Promise.all([
    ctx.db.get(inject.roleId),
    ctx.db
      .query("endpoints")
      .withIndex("by_role_active", (q) =>
        q.eq("roleId", inject.roleId).eq("active", true),
      )
      .unique(),
  ]);
  if (role === null || endpoint === null) {
    throw new ConvexError("Required role endpoint is unavailable");
  }
  const idempotencyKey = `inject:${inject._id}:role:${role._id}`;
  const existing = await ctx.db
    .query("deliveries")
    .withIndex("by_idempotency_key", (q) =>
      q.eq("idempotencyKey", idempotencyKey),
    )
    .unique();
  if (existing !== null) return false;
  await ctx.db.patch(inject._id, {
    status: "queued",
    version: inject.version + 1,
    updatedAt: now,
  });
  await ctx.db.patch(role._id, {
    currentInjectId: inject._id,
    status: "active",
    version: role.version + 1,
    updatedAt: now,
  });
  await ctx.db.insert("deliveries", {
    idempotencyKey,
    sessionId,
    roleId: role._id,
    injectId: inject._id,
    semanticType: "scenario.inject",
    conversationId: endpoint.conversationId,
    channel: endpoint.channel,
    payload: {
      text: inject.exerciseText,
      blocks: blocksForInject(inject),
      ...(inject.emailSubject === undefined
        ? {}
        : {
            html: `<p>${inject.exerciseText.replaceAll("\n", "<br>")}</p>`,
          }),
    },
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return true;
}

const initialFacts = [
  ["bay3.pressureTrend", "RISING"],
  ["bay3.sensorConfidence", 0.71],
  ["bay3.access", "OPEN"],
  ["bay5.access", "OPEN"],
  ["crew7.location", "STAGING"],
  ["crew7.route", null],
  ["commander.notified", false],
  ["incident.escalation", "PENDING_CONFIRMATION"],
] as const;

export async function seedScenarioState(
  ctx: GenericMutationCtx<DataModel>,
  sessionId: Id<"sessions">,
  roleIds: Record<CanonicalRole, Id<"roles">>,
  now: number,
): Promise<void> {
  for (const [factKey, value] of initialFacts) {
    await ctx.db.insert("worldFacts", {
      sessionId,
      factKey,
      value,
      version: 1,
      sourceEventId: "scenario:initial",
      validFrom: now,
      createdAt: now,
    });
  }

  for (const [injectKey, definition] of Object.entries(injectDefinitions)) {
    const subject = "subject" in definition ? definition.subject : undefined;
    const faultType =
      "faultType" in definition ? definition.faultType : undefined;
    await ctx.db.insert("injects", {
      sessionId,
      injectKey,
      roleId: roleIds[definition.role],
      status: "planned",
      exerciseText: definition.text,
      ...(subject === undefined ? {} : { emailSubject: subject }),
      allowedDecisions: [...definition.allowed],
      prerequisiteKeys: [...definition.prerequisites],
      ...(faultType === undefined ? {} : { faultType }),
      clarificationCount: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
}
