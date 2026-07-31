import type { GenericMutationCtx } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { writeDeterministicReport } from "./reportData";
import {
  injectKnowledgeDefinitions,
  queueScenarioInject,
} from "./scenarioData";

const decisionValidator = v.union(
  v.literal("SEAL_BAY_3"),
  v.literal("INSPECT"),
  v.literal("WAIT"),
  v.literal("ROUTE_BAY_3"),
  v.literal("ROUTE_BAY_5"),
  v.literal("NOTIFY_COMMANDER"),
  v.literal("WAIT_FOR_CONFIRMATION"),
  v.literal("PASSAGE_BLOCKED"),
  v.literal("PASSAGE_AVAILABLE"),
  v.literal("REROUTE_BAY_5"),
  v.literal("REQUEST_OVERRIDE"),
  v.literal("ESCALATE_NOW"),
  v.literal("HOLD"),
);

const parseMethodValidator = v.union(
  v.literal("command"),
  v.literal("phrase"),
  v.literal("gemini"),
  v.literal("clarification"),
);

type MutationCtx = GenericMutationCtx<DataModel>;

async function latestWorldFact(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
  factKey: string,
): Promise<Doc<"worldFacts"> | null> {
  return await ctx.db
    .query("worldFacts")
    .withIndex("by_session_fact_version", (q) =>
      q.eq("sessionId", sessionId).eq("factKey", factKey),
    )
    .order("desc")
    .first();
}

async function writeWorldFact(
  ctx: MutationCtx,
  input: {
    sessionId: Id<"sessions">;
    factKey: string;
    value: unknown;
    sourceEventId: string;
    now: number;
  },
): Promise<Doc<"worldFacts">> {
  const previous = await latestWorldFact(ctx, input.sessionId, input.factKey);
  if (previous !== null) {
    await ctx.db.patch(previous._id, { supersededAt: input.now });
  }
  const id = await ctx.db.insert("worldFacts", {
    sessionId: input.sessionId,
    factKey: input.factKey,
    value: input.value,
    version: (previous?.version ?? 0) + 1,
    sourceEventId: input.sourceEventId,
    validFrom: input.now,
    createdAt: input.now,
  });
  const fact = await ctx.db.get(id);
  if (fact === null) throw new ConvexError("Failed to create fact");
  return fact;
}

async function teachRole(
  ctx: MutationCtx,
  input: {
    sessionId: Id<"sessions">;
    roleId: Id<"roles">;
    fact: Doc<"worldFacts">;
    sourceInjectId: Id<"injects">;
    now: number;
  },
): Promise<void> {
  await ctx.db.insert("roleKnowledge", {
    sessionId: input.sessionId,
    roleId: input.roleId,
    factKey: input.fact.factKey,
    observedValue: input.fact.value,
    worldVersionObserved: input.fact.version,
    sourceInjectId: input.sourceInjectId,
    learnedAt: input.now,
    stale: false,
  });
}

async function recordConfirmedInjectKnowledge(
  ctx: MutationCtx,
  input: {
    sessionId: Id<"sessions">;
    roleId: Id<"roles">;
    inject: Doc<"injects">;
    now: number;
  },
): Promise<void> {
  if (!(input.inject.injectKey in injectKnowledgeDefinitions)) return;
  const definitions =
    injectKnowledgeDefinitions[
      input.inject.injectKey as keyof typeof injectKnowledgeDefinitions
    ];
  for (const definition of definitions) {
    const existing = await ctx.db
      .query("roleKnowledge")
      .withIndex("by_role_fact_learned", (q) =>
        q.eq("roleId", input.roleId).eq("factKey", definition.factKey),
      )
      .collect();
    if (
      existing.some(({ sourceInjectId }) => sourceInjectId === input.inject._id)
    ) {
      continue;
    }
    const fact = await ctx.db
      .query("worldFacts")
      .withIndex("by_session_fact_version", (q) => {
        const byFact = q
          .eq("sessionId", input.sessionId)
          .eq("factKey", definition.factKey);
        return "version" in definition
          ? byFact.eq("version", definition.version)
          : byFact;
      })
      .order("desc")
      .first();
    if (fact === null) continue;
    await ctx.db.insert("roleKnowledge", {
      sessionId: input.sessionId,
      roleId: input.roleId,
      factKey: fact.factKey,
      observedValue: fact.value,
      worldVersionObserved: fact.version,
      sourceInjectId: input.inject._id,
      learnedAt: input.now,
      stale: definition.stale,
    });
  }
}

async function hasAppliedDecision(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
  decision: string,
): Promise<boolean> {
  const decisions = await ctx.db
    .query("decisions")
    .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
    .collect();
  return decisions.some(
    (record) =>
      record.status === "applied" && record.canonicalDecision === decision,
  );
}

async function maybeDetectContradiction(
  ctx: MutationCtx,
  input: {
    sessionId: Id<"sessions">;
    decisionId: Id<"decisions">;
    now: number;
  },
): Promise<Id<"contradictions"> | null> {
  const existing = await ctx.db
    .query("contradictions")
    .withIndex("by_session_key", (q) =>
      q.eq("sessionId", input.sessionId).eq("contradictionKey", "C-BAY3"),
    )
    .unique();
  if (existing !== null) return null;
  const bay3 = await latestWorldFact(ctx, input.sessionId, "bay3.access");
  if (bay3?.value !== "SEALED") return null;
  const decisions = await ctx.db
    .query("decisions")
    .withIndex("by_session_created", (q) => q.eq("sessionId", input.sessionId))
    .collect();
  const route = decisions.find(
    ({ status, canonicalDecision }) =>
      status === "applied" && canonicalDecision === "ROUTE_BAY_3",
  );
  if (route === undefined) return null;
  const field = decisions.find(
    ({ status, canonicalDecision }) =>
      status === "applied" && canonicalDecision === "SEAL_BAY_3",
  );
  return await ctx.db.insert("contradictions", {
    sessionId: input.sessionId,
    contradictionKey: "C-BAY3",
    type: "ACTION_VS_WORLD_STATE",
    status: "detected",
    factRefs: ["bay3.access"],
    decisionRefs: [field?._id, route._id].filter(
      (id): id is Id<"decisions"> => id !== undefined,
    ),
    detectedAt: input.now,
    details: {
      controlKnowledgeVersion: 1,
      worldVersion: bay3.version,
      triggeringDecisionId: input.decisionId,
    },
  });
}

async function maybeQueueReconciliation(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  now: number,
): Promise<void> {
  const contradiction = await ctx.db
    .query("contradictions")
    .withIndex("by_session_key", (q) =>
      q.eq("sessionId", session._id).eq("contradictionKey", "C-BAY3"),
    )
    .unique();
  if (contradiction === null) return;
  const directorInject = await ctx.db
    .query("injects")
    .withIndex("by_session_inject_key", (q) =>
      q.eq("sessionId", session._id).eq("injectKey", "D1"),
    )
    .unique();
  if (
    directorInject === null ||
    !["answered", "closed"].includes(directorInject.status)
  ) {
    return;
  }
  const opened = await Promise.all(
    ["RF1", "RC1", "RD1"].map(
      async (injectKey) =>
        await queueScenarioInject(ctx, session._id, injectKey, now),
    ),
  );
  if (opened.some(Boolean)) {
    await ctx.db.patch(contradiction._id, {
      status: "notified",
      notifiedAt: contradiction.notifiedAt ?? now,
    });
    if (session.status === "running") {
      await ctx.db.patch(session._id, {
        status: "resolving",
        version: session.version + 1,
        updatedAt: now,
      });
    }
  }
}

async function maybeFinalize(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  now: number,
): Promise<boolean> {
  const safelyResolved = await Promise.all(
    ["PASSAGE_BLOCKED", "REROUTE_BAY_5", "ESCALATE_NOW"].map(
      async (decision) => await hasAppliedDecision(ctx, session._id, decision),
    ),
  );
  const [current, contradiction, injects, roles] = await Promise.all([
    ctx.db.get(session._id),
    ctx.db
      .query("contradictions")
      .withIndex("by_session_key", (q) =>
        q.eq("sessionId", session._id).eq("contradictionKey", "C-BAY3"),
      )
      .unique(),
    ctx.db
      .query("injects")
      .withIndex("by_session_inject_key", (q) => q.eq("sessionId", session._id))
      .collect(),
    ctx.db
      .query("roles")
      .withIndex("by_session_role", (q) => q.eq("sessionId", session._id))
      .collect(),
  ]);
  if (
    current === null ||
    ["completed", "failed", "aborted"].includes(current.status)
  ) {
    return false;
  }
  const byKey = new Map(injects.map((inject) => [inject.injectKey, inject]));
  const initialFinished = ["F1", "C1", "D1"].every((key) =>
    ["answered", "closed", "expired"].includes(
      byKey.get(key)?.status ?? "planned",
    ),
  );
  const reconciliationFinished = ["RF1", "RC1", "RD1"].every((key) =>
    ["answered", "closed"].includes(byKey.get(key)?.status ?? "planned"),
  );
  const resolved = safelyResolved.every(Boolean);
  if (contradiction === null && !initialFinished) return false;
  if (contradiction !== null && !resolved && !reconciliationFinished) {
    return false;
  }
  const finalStatus =
    contradiction === null || resolved
      ? ("completed" as const)
      : ("failed" as const);
  await ctx.db.patch(current._id, {
    status: finalStatus,
    version: current.version + 1,
    completedAt: now,
    updatedAt: now,
  });
  for (const inject of injects) {
    if (inject.status === "answered") {
      await ctx.db.patch(inject._id, {
        status: "closed",
        version: inject.version + 1,
        updatedAt: now,
      });
    } else if (inject.status === "planned") {
      await ctx.db.patch(inject._id, {
        status: "cancelled",
        version: inject.version + 1,
        updatedAt: now,
      });
    }
  }
  for (const role of roles) {
    await ctx.db.patch(role._id, {
      currentInjectId: undefined,
      status: "completed",
      version: role.version + 1,
      updatedAt: now,
    });
  }
  if (contradiction !== null && resolved) {
    await ctx.db.patch(contradiction._id, {
      status: "resolved",
      resolvedAt: contradiction.resolvedAt ?? now,
    });
  }
  await ctx.db.insert("auditEvents", {
    sessionId: session._id,
    ...(contradiction === null ? {} : { contradictionId: contradiction._id }),
    type: `session.${finalStatus}`,
    actorType: "system",
    safeMetadata: {
      reason:
        contradiction === null
          ? "no_contradiction"
          : resolved
            ? "contradiction_resolved"
            : "unsafe_reconciliation",
    },
    createdAt: now,
  });
  await writeDeterministicReport(ctx, session._id, now);
  return true;
}

export const activePrompt = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const endpoint = await ctx.db
      .query("endpoints")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (endpoint === null || !endpoint.active) return null;
    const [role, session] = await Promise.all([
      ctx.db.get(endpoint.roleId),
      ctx.db.get(endpoint.sessionId),
    ]);
    if (role?.currentInjectId === undefined) return null;
    const inject = await ctx.db.get(role.currentInjectId);
    if (inject === null) return null;
    return {
      injectId: inject._id,
      injectKey: inject.injectKey,
      status: inject.status,
      version: inject.version,
      allowedDecisions: inject.allowedDecisions,
      exerciseText: inject.exerciseText,
      clarificationCount: inject.clarificationCount,
      roleKey: role.roleKey,
      sessionStatus: session?.status ?? "failed",
      pauseReason: session?.pauseReason ?? null,
    };
  },
});

export const accept = mutation({
  args: {
    inboundEventId: v.string(),
    conversationId: v.string(),
    injectId: v.id("injects"),
    expectedInjectVersion: v.number(),
    canonicalDecision: decisionValidator,
    parseMethod: parseMethodValidator,
    confidence: v.optional(v.number()),
    rationaleSummary: v.optional(v.string()),
    modelLatencyMs: v.optional(v.number()),
    modelUsed: v.optional(
      v.union(v.literal("primary"), v.literal("fallback"), v.literal("none")),
    ),
    rawTextRedacted: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const duplicate = await ctx.db
      .query("decisions")
      .withIndex("by_inbound_event", (q) =>
        q.eq("inboundEventId", args.inboundEventId),
      )
      .unique();
    if (duplicate !== null) {
      return { outcome: "duplicate" as const, decisionId: duplicate._id };
    }
    const endpoint = await ctx.db
      .query("endpoints")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (endpoint === null || !endpoint.active) {
      throw new ConvexError("Conversation is not role-bound");
    }
    const inbound = await ctx.db
      .query("inboundEvents")
      .withIndex("by_message", (q) => q.eq("messageId", args.inboundEventId))
      .unique();
    if (inbound !== null) {
      await ctx.db.patch(inbound._id, {
        sessionId: endpoint.sessionId,
        roleId: endpoint.roleId,
      });
    }
    const [role, session, inject] = await Promise.all([
      ctx.db.get(endpoint.roleId),
      ctx.db.get(endpoint.sessionId),
      ctx.db.get(args.injectId),
    ]);
    if (role === null || session === null || inject === null) {
      throw new ConvexError("Decision context is unavailable");
    }
    if (
      !["running", "resolving"].includes(session.status) ||
      inject.status !== "open" ||
      inject.version !== args.expectedInjectVersion ||
      inject.roleId !== role._id ||
      role.currentInjectId !== inject._id
    ) {
      const decisionId = await ctx.db.insert("decisions", {
        sessionId: session._id,
        roleId: role._id,
        injectId: inject._id,
        inboundEventId: args.inboundEventId,
        rawTextRedacted: args.rawTextRedacted,
        parseMethod: args.parseMethod,
        ...(args.modelLatencyMs === undefined
          ? {}
          : { modelLatencyMs: args.modelLatencyMs }),
        ...(args.modelUsed === undefined ? {} : { modelUsed: args.modelUsed }),
        status: "rejected_stale",
        createdAt: args.now,
      });
      return { outcome: "stale" as const, decisionId };
    }
    if (!inject.allowedDecisions.includes(args.canonicalDecision)) {
      const decisionId = await ctx.db.insert("decisions", {
        sessionId: session._id,
        roleId: role._id,
        injectId: inject._id,
        inboundEventId: args.inboundEventId,
        canonicalDecision: args.canonicalDecision,
        rawTextRedacted: args.rawTextRedacted,
        parseMethod: args.parseMethod,
        ...(args.confidence === undefined
          ? {}
          : { confidence: args.confidence }),
        ...(args.rationaleSummary === undefined
          ? {}
          : { rationaleSummary: args.rationaleSummary }),
        ...(args.modelLatencyMs === undefined
          ? {}
          : { modelLatencyMs: args.modelLatencyMs }),
        ...(args.modelUsed === undefined ? {} : { modelUsed: args.modelUsed }),
        status: "rejected_invalid",
        createdAt: args.now,
      });
      return { outcome: "invalid" as const, decisionId };
    }

    await recordConfirmedInjectKnowledge(ctx, {
      sessionId: session._id,
      roleId: role._id,
      inject,
      now: args.now,
    });

    const decisionId = await ctx.db.insert("decisions", {
      sessionId: session._id,
      roleId: role._id,
      injectId: inject._id,
      inboundEventId: args.inboundEventId,
      canonicalDecision: args.canonicalDecision,
      rawTextRedacted: args.rawTextRedacted,
      parseMethod: args.parseMethod,
      ...(args.confidence === undefined ? {} : { confidence: args.confidence }),
      ...(args.rationaleSummary === undefined
        ? {}
        : { rationaleSummary: args.rationaleSummary }),
      ...(args.modelLatencyMs === undefined
        ? {}
        : { modelLatencyMs: args.modelLatencyMs }),
      ...(args.modelUsed === undefined ? {} : { modelUsed: args.modelUsed }),
      status: "applied",
      appliedAt: args.now,
      createdAt: args.now,
    });
    await ctx.db.patch(inject._id, {
      status: "answered",
      closesAt: args.now,
      version: inject.version + 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(role._id, {
      currentInjectId: undefined,
      version: role.version + 1,
      updatedAt: args.now,
    });

    let fact: Doc<"worldFacts"> | null = null;
    switch (args.canonicalDecision) {
      case "SEAL_BAY_3":
        fact = await writeWorldFact(ctx, {
          sessionId: session._id,
          factKey: "bay3.access",
          value: "SEALED",
          sourceEventId: args.inboundEventId,
          now: args.now,
        });
        await teachRole(ctx, {
          sessionId: session._id,
          roleId: role._id,
          fact,
          sourceInjectId: inject._id,
          now: args.now,
        });
        await queueScenarioInject(ctx, session._id, "C1", args.now);
        break;
      case "ROUTE_BAY_3":
        await writeWorldFact(ctx, {
          sessionId: session._id,
          factKey: "crew7.route",
          value: "BAY_3",
          sourceEventId: args.inboundEventId,
          now: args.now,
        });
        break;
      case "ROUTE_BAY_5":
      case "REROUTE_BAY_5":
        await writeWorldFact(ctx, {
          sessionId: session._id,
          factKey: "crew7.route",
          value: "BAY_5",
          sourceEventId: args.inboundEventId,
          now: args.now,
        });
        break;
      case "NOTIFY_COMMANDER":
      case "ESCALATE_NOW":
        await writeWorldFact(ctx, {
          sessionId: session._id,
          factKey: "commander.notified",
          value: true,
          sourceEventId: args.inboundEventId,
          now: args.now,
        });
        await writeWorldFact(ctx, {
          sessionId: session._id,
          factKey: "incident.escalation",
          value: "ESCALATED",
          sourceEventId: args.inboundEventId,
          now: args.now,
        });
        break;
      case "WAIT_FOR_CONFIRMATION":
      case "HOLD":
        await writeWorldFact(ctx, {
          sessionId: session._id,
          factKey: "incident.escalation",
          value: "DELAYED",
          sourceEventId: args.inboundEventId,
          now: args.now,
        });
        break;
      case "INSPECT":
        fact = await writeWorldFact(ctx, {
          sessionId: session._id,
          factKey: "bay3.sensorConfidence",
          value: 0.92,
          sourceEventId: args.inboundEventId,
          now: args.now,
        });
        await teachRole(ctx, {
          sessionId: session._id,
          roleId: role._id,
          fact,
          sourceInjectId: inject._id,
          now: args.now,
        });
        break;
      default:
        break;
    }

    const contradictionId = await maybeDetectContradiction(ctx, {
      sessionId: session._id,
      decisionId,
      now: args.now,
    });
    await maybeQueueReconciliation(ctx, session, args.now);
    const sessionFinalized = await maybeFinalize(ctx, session, args.now);
    await ctx.db.insert("auditEvents", {
      sessionId: session._id,
      roleId: role._id,
      injectId: inject._id,
      decisionId,
      ...(contradictionId === null ? {} : { contradictionId }),
      type: "decision.applied",
      actorType: "participant",
      safeMetadata: {
        roleKey: role.roleKey,
        decision: args.canonicalDecision,
        parseMethod: args.parseMethod,
      },
      createdAt: args.now,
    });
    return {
      outcome: "applied" as const,
      decisionId,
      contradictionDetected: contradictionId !== null,
      sessionId: session._id,
      sessionFinalized,
    };
  },
});

export const requestClarification = mutation({
  args: {
    inboundEventId: v.string(),
    conversationId: v.string(),
    injectId: v.id("injects"),
    expectedInjectVersion: v.number(),
    rawTextRedacted: v.string(),
    modelLatencyMs: v.optional(v.number()),
    modelUsed: v.optional(
      v.union(v.literal("primary"), v.literal("fallback"), v.literal("none")),
    ),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const endpoint = await ctx.db
      .query("endpoints")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    const [inject, session] = await Promise.all([
      ctx.db.get(args.injectId),
      endpoint === null ? null : ctx.db.get(endpoint.sessionId),
    ]);
    if (
      endpoint === null ||
      session === null ||
      !["running", "resolving"].includes(session.status) ||
      inject === null ||
      inject.roleId !== endpoint.roleId ||
      inject.status !== "open" ||
      inject.version !== args.expectedInjectVersion
    ) {
      return { outcome: "stale" as const, showExplicitOptions: true };
    }
    const existing = await ctx.db
      .query("decisions")
      .withIndex("by_inbound_event", (q) =>
        q.eq("inboundEventId", args.inboundEventId),
      )
      .unique();
    if (existing !== null) {
      return {
        outcome: "duplicate" as const,
        showExplicitOptions: inject.clarificationCount >= 1,
      };
    }
    await recordConfirmedInjectKnowledge(ctx, {
      sessionId: session._id,
      roleId: endpoint.roleId,
      inject,
      now: args.now,
    });
    await ctx.db.insert("decisions", {
      sessionId: endpoint.sessionId,
      roleId: endpoint.roleId,
      injectId: inject._id,
      inboundEventId: args.inboundEventId,
      rawTextRedacted: args.rawTextRedacted,
      parseMethod: "clarification",
      ...(args.modelLatencyMs === undefined
        ? {}
        : { modelLatencyMs: args.modelLatencyMs }),
      ...(args.modelUsed === undefined ? {} : { modelUsed: args.modelUsed }),
      status: "clarification_required",
      createdAt: args.now,
    });
    const nextCount = inject.clarificationCount + 1;
    await ctx.db.patch(inject._id, {
      clarificationCount: nextCount,
      version: inject.version + 1,
      updatedAt: args.now,
    });
    return {
      outcome: "clarification" as const,
      showExplicitOptions: nextCount >= 2,
      allowedDecisions: inject.allowedDecisions,
      nextInjectVersion: inject.version + 1,
    };
  },
});
