import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";

export async function writeDeterministicReport(
  ctx: GenericMutationCtx<DataModel>,
  sessionId: Id<"sessions">,
  generatedAt: number,
): Promise<Id<"reports">> {
  const session = await ctx.db.get(sessionId);
  if (session === null) throw new Error("Session not found");
  const [
    roles,
    knowledge,
    decisions,
    contradictions,
    deliveries,
    existingReports,
  ] = await Promise.all([
    ctx.db
      .query("roles")
      .withIndex("by_session_role", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db.query("roleKnowledge").collect(),
    ctx.db
      .query("decisions")
      .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("contradictions")
      .withIndex("by_session_key", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db.query("deliveries").collect(),
    ctx.db
      .query("reports")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
  ]);
  const sessionKnowledge = knowledge.filter(
    (item) => item.sessionId === sessionId,
  );
  const sessionDeliveries = deliveries.filter(
    (item) => item.sessionId === sessionId,
  );
  const field = decisions.find(
    ({ canonicalDecision }) => canonicalDecision === "SEAL_BAY_3",
  );
  const control = decisions.find(
    ({ canonicalDecision }) => canonicalDecision === "ROUTE_BAY_3",
  );
  const contradiction = contradictions.find(
    ({ contradictionKey }) => contradictionKey === "C-BAY3",
  );
  const firstReconciliation = decisions
    .filter(({ canonicalDecision }) =>
      ["PASSAGE_BLOCKED", "REROUTE_BAY_5", "ESCALATE_NOW"].includes(
        canonicalDecision ?? "",
      ),
    )
    .sort(
      (a, b) => (a.appliedAt ?? a.createdAt) - (b.appliedAt ?? b.createdAt),
    )[0];
  const latencyByChannel = Object.fromEntries(
    [...new Set(sessionDeliveries.map(({ channel }) => channel))].map(
      (channel) => {
        const latencies = sessionDeliveries
          .filter((delivery) => delivery.channel === channel)
          .flatMap(({ latencyMs }) =>
            latencyMs === undefined ? [] : [latencyMs],
          );
        return [
          channel,
          latencies.length === 0
            ? null
            : Math.round(
                latencies.reduce((sum, value) => sum + value, 0) /
                  latencies.length,
              ),
        ];
      },
    ),
  );
  const roleById = new Map(roles.map((role) => [role._id, role]));
  const metrics = {
    sessionDurationMs:
      session.startedAt === undefined || session.completedAt === undefined
        ? null
        : session.completedAt - session.startedAt,
    fieldToControlConflictMs:
      field?.appliedAt === undefined || control?.appliedAt === undefined
        ? null
        : control.appliedAt - field.appliedAt,
    contradictionDetectionMs:
      contradiction === undefined || control?.appliedAt === undefined
        ? null
        : contradiction.detectedAt - control.appliedAt,
    knowledgeDivergenceMs:
      contradiction?.resolvedAt === undefined || field?.appliedAt === undefined
        ? null
        : contradiction.resolvedAt - field.appliedAt,
    firstReconciliationResponseMs:
      contradiction === undefined ||
      firstReconciliation?.appliedAt === undefined
        ? null
        : firstReconciliation.appliedAt - contradiction.detectedAt,
    contradictionResolutionMs:
      contradiction?.resolvedAt === undefined
        ? null
        : contradiction.resolvedAt - contradiction.detectedAt,
    deliveryLatencyMsByChannel: latencyByChannel,
    retryCount: sessionDeliveries.reduce(
      (sum, delivery) => sum + Math.max(0, delivery.attempts - 1),
      0,
    ),
    failedDeliveryCount: sessionDeliveries.filter(
      ({ status }) => status === "failed",
    ).length,
    contradictionCount: contradictions.length,
    timeline: [
      ...sessionKnowledge.map((item) => ({
        type: "knowledge",
        at: item.learnedAt,
        role: roleById.get(item.roleId)?.roleKey ?? "unknown",
        factKey: item.factKey,
        observedValue: item.observedValue,
        worldVersionObserved: item.worldVersionObserved,
        stale: item.stale,
      })),
      ...decisions.map((item) => ({
        type: "decision",
        at: item.appliedAt ?? item.createdAt,
        role: roleById.get(item.roleId)?.roleKey ?? "unknown",
        decision: item.canonicalDecision ?? null,
        status: item.status,
      })),
      ...contradictions.map((item) => ({
        type: "contradiction",
        at: item.detectedAt,
        contradictionKey: item.contradictionKey,
        status: item.status,
      })),
    ].sort((a, b) => a.at - b.at),
  };
  const deterministicSummary = [
    `Session ${session.publicCode} ended ${session.status}.`,
    `${contradictions.length} deterministic contradiction${contradictions.length === 1 ? " was" : "s were"} recorded.`,
    contradiction === undefined
      ? "No Bay 3 routing conflict was recorded."
      : `Bay 3 knowledge diverged for ${metrics.knowledgeDivergenceMs ?? "an unknown number of"} ms before resolution.`,
  ].join(" ");
  for (const existing of existingReports) await ctx.db.delete(existing._id);
  return await ctx.db.insert("reports", {
    sessionId,
    metrics,
    deterministicSummary,
    generatedAt,
  });
}
