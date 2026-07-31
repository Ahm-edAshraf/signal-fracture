import { v } from "convex/values";
import { query } from "./_generated/server";

function eventRef(value: string): string {
  return value.length <= 8 ? value : `…${value.slice(-8)}`;
}

export const publicState = query({
  args: { publicCode: v.string() },
  handler: async (ctx, args) => {
    const channelHealth = (await ctx.db.query("channelHealth").collect())
      .map(({ channel, status, checkedAt }) => ({
        channel,
        status,
        checkedAt,
      }))
      .sort((a, b) => a.channel.localeCompare(b.channel));
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_public_code", (q) => q.eq("publicCode", args.publicCode))
      .first();
    if (session === null) return { channelHealth, session: null };

    const [
      roles,
      endpoints,
      worldFacts,
      knowledge,
      injects,
      decisions,
      contradictions,
      deliveries,
      inboundEvents,
      reports,
    ] = await Promise.all([
      ctx.db
        .query("roles")
        .withIndex("by_session_role", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db.query("endpoints").collect(),
      ctx.db
        .query("worldFacts")
        .withIndex("by_session_fact_version", (q) =>
          q.eq("sessionId", session._id),
        )
        .collect(),
      ctx.db.query("roleKnowledge").collect(),
      ctx.db
        .query("injects")
        .withIndex("by_session_inject_key", (q) =>
          q.eq("sessionId", session._id),
        )
        .collect(),
      ctx.db
        .query("decisions")
        .withIndex("by_session_created", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db
        .query("contradictions")
        .withIndex("by_session_key", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db.query("deliveries").collect(),
      ctx.db.query("inboundEvents").collect(),
      ctx.db
        .query("reports")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect(),
    ]);

    const roleById = new Map(roles.map((role) => [role._id, role]));
    const activeEndpoints = endpoints.filter(
      (endpoint) => endpoint.sessionId === session._id && endpoint.active,
    );
    const latestFacts = new Map<string, (typeof worldFacts)[number]>();
    for (const fact of worldFacts) {
      const current = latestFacts.get(fact.factKey);
      if (current === undefined || fact.version > current.version) {
        latestFacts.set(fact.factKey, fact);
      }
    }
    const sessionKnowledge = knowledge.filter(
      (item) => item.sessionId === session._id,
    );
    const sessionDeliveries = deliveries.filter(
      (item) => item.sessionId === session._id,
    );
    const sessionInbound = inboundEvents.filter(
      (item) => item.sessionId === session._id,
    );
    const report = reports.sort((a, b) => b.generatedAt - a.generatedAt)[0];

    return {
      channelHealth,
      session: {
        scenarioId: session.scenarioId,
        publicCode: session.publicCode,
        status: session.status,
        pauseReason: session.pauseReason ?? null,
        version: session.version,
        startedAt: session.startedAt ?? null,
        completedAt: session.completedAt ?? null,
        updatedAt: session.updatedAt,
      },
      roles: roles.map((role) => ({
        roleKey: role.roleKey,
        displayName: role.displayName,
        publicAlias: role.publicAlias,
        status: role.status,
        channel:
          activeEndpoints.find((endpoint) => endpoint.roleId === role._id)
            ?.channel ?? null,
      })),
      worldFacts: [...latestFacts.values()]
        .map(({ factKey, value, version, validFrom }) => ({
          factKey,
          value,
          version,
          validFrom,
        }))
        .sort((a, b) => a.factKey.localeCompare(b.factKey)),
      roleKnowledge: sessionKnowledge
        .map((item) => ({
          roleKey: roleById.get(item.roleId)?.roleKey ?? "unknown",
          factKey: item.factKey,
          observedValue: item.observedValue,
          worldVersionObserved: item.worldVersionObserved,
          learnedAt: item.learnedAt,
          stale: item.stale,
        }))
        .sort((a, b) => a.learnedAt - b.learnedAt),
      injects: injects
        .map((inject) => ({
          injectKey: inject.injectKey,
          roleKey: roleById.get(inject.roleId)?.roleKey ?? "unknown",
          status: inject.status,
          faultType: inject.faultType ?? null,
          allowedDecisions: inject.allowedDecisions,
          opensAt: inject.opensAt ?? null,
          deadlineAt: inject.deadlineAt ?? null,
          closesAt: inject.closesAt ?? null,
          updatedAt: inject.updatedAt,
        }))
        .sort((a, b) => a.updatedAt - b.updatedAt),
      decisions: decisions
        .map((decision) => ({
          roleKey: roleById.get(decision.roleId)?.roleKey ?? "unknown",
          decision: decision.canonicalDecision ?? null,
          status: decision.status,
          parseMethod: decision.parseMethod,
          modelLatencyMs: decision.modelLatencyMs ?? null,
          modelUsed: decision.modelUsed ?? null,
          at: decision.appliedAt ?? decision.createdAt,
        }))
        .sort((a, b) => a.at - b.at),
      contradictions: contradictions
        .map((item) => ({
          contradictionKey: item.contradictionKey,
          type: item.type,
          status: item.status,
          factRefs: item.factRefs,
          detectedAt: item.detectedAt,
          notifiedAt: item.notifiedAt ?? null,
          resolvedAt: item.resolvedAt ?? null,
        }))
        .sort((a, b) => a.detectedAt - b.detectedAt),
      deliveries: sessionDeliveries
        .map((delivery) => ({
          semanticType: delivery.semanticType,
          roleKey: roleById.get(delivery.roleId)?.roleKey ?? "unknown",
          channel: delivery.channel,
          status: delivery.status,
          attempts: delivery.attempts,
          latencyMs: delivery.latencyMs ?? null,
          updatedAt: delivery.updatedAt,
        }))
        .sort((a, b) => a.updatedAt - b.updatedAt),
      inboundEvents: sessionInbound
        .map((event) => ({
          eventRef: eventRef(event.caspianEventId),
          channel: event.channel,
          mediaCount: event.mediaCount ?? 0,
          status: event.status,
          duplicateCount: event.duplicateCount ?? 0,
          receivedAt: event.receivedAt,
          processedAt: event.processedAt ?? null,
        }))
        .sort((a, b) => a.receivedAt - b.receivedAt),
      report:
        report === undefined
          ? null
          : {
              metrics: report.metrics,
              deterministicSummary: report.deterministicSummary,
              narrative: report.narrative ?? null,
              narrativeModelLatencyMs: report.narrativeModelLatencyMs ?? null,
              narrativeModelUsed: report.narrativeModelUsed ?? null,
              generatedAt: report.generatedAt,
            },
      reliability: {
        duplicateCount: sessionInbound.reduce(
          (sum, event) => sum + (event.duplicateCount ?? 0),
          0,
        ),
        retryCount: sessionDeliveries.reduce(
          (sum, delivery) => sum + Math.max(0, delivery.attempts - 1),
          0,
        ),
        failedDeliveryCount: sessionDeliveries.filter(
          ({ status }) => status === "failed",
        ).length,
      },
    };
  },
});
