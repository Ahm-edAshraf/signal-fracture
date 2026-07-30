import type { GenericMutationCtx } from "convex/server";
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
    text: `${EXERCISE_BANNER}\n\nNew field state conflicts with your route. Choose: REROUTE BAY 5 or REQUEST OVERRIDE.`,
    allowed: ["REROUTE_BAY_5", "REQUEST_OVERRIDE"],
    prerequisites: ["C-BAY3"],
    faultType: "conflict",
  },
  RD1: {
    role: "director",
    subject: "[EXERCISE] Coordination fault detected — escalation required",
    text: `${EXERCISE_BANNER}\n\nRouting conflicts with field containment. Choose: ESCALATE NOW or HOLD.`,
    allowed: ["ESCALATE_NOW", "HOLD"],
    prerequisites: ["C-BAY3", "D1"],
    faultType: "escalation_delay",
  },
} as const;

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

const initialKnowledge = {
  field: [
    ["bay3.pressureTrend", "RISING", false],
    ["bay3.sensorConfidence", 0.71, false],
    ["bay3.access", "OPEN", false],
  ],
  control: [
    ["bay3.access", "OPEN", true],
    ["bay5.access", "OPEN", false],
    ["crew7.location", "STAGING", false],
  ],
  director: [
    ["bay3.pressureTrend", "RISING", false],
    ["incident.escalation", "PENDING_CONFIRMATION", false],
  ],
} as const;

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

  for (const role of Object.keys(initialKnowledge) as CanonicalRole[]) {
    for (const [factKey, observedValue, stale] of initialKnowledge[role]) {
      await ctx.db.insert("roleKnowledge", {
        sessionId,
        roleId: roleIds[role],
        factKey,
        observedValue,
        worldVersionObserved: 1,
        learnedAt: now,
        stale,
      });
    }
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
