import type { ScenarioState } from "./domain";

export type ScenarioMetrics = {
  coordinationScore: number;
  sessionDurationMs: number | null;
  fieldToControlConflictMs: number | null;
  contradictionDetectionMs: number | null;
  knowledgeDivergenceMs: number | null;
  contradictionResolutionMs: number | null;
  duplicateInboundCount: number;
  staleResponseCount: number;
  clarificationCount: number;
  retryCount: number;
};

export function calculateCoordinationScore(input: {
  contradictionCount: number;
  resolvedContradictionCount: number;
  retryCount: number;
  failedDeliveryCount: number;
  contradictionResolutionMs: number | null;
}): number {
  const unresolved = Math.max(
    0,
    input.contradictionCount - input.resolvedContradictionCount,
  );
  const resolutionPenalty =
    input.contradictionResolutionMs === null
      ? 0
      : Math.min(20, Math.floor(input.contradictionResolutionMs / 30_000) * 2);
  const penalty =
    input.contradictionCount * 10 +
    unresolved * 25 +
    Math.min(10, input.retryCount * 2) +
    input.failedDeliveryCount * 20 +
    resolutionPenalty;
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function calculateMetrics(state: ScenarioState): ScenarioMetrics {
  const field = state.decisions.find(
    ({ decision }) => decision === "SEAL_BAY_3",
  );
  const control = state.decisions.find(
    ({ decision }) => decision === "ROUTE_BAY_3",
  );
  const contradiction = state.contradictions.find(
    ({ key }) => key === "C-BAY3",
  );
  const contradictionResolutionMs =
    contradiction?.resolvedAt === null || contradiction === undefined
      ? null
      : contradiction.resolvedAt - contradiction.detectedAt;
  return {
    coordinationScore: calculateCoordinationScore({
      contradictionCount: state.contradictions.length,
      resolvedContradictionCount: state.contradictions.filter(
        ({ status }) => status === "resolved",
      ).length,
      retryCount: state.counters.retries,
      failedDeliveryCount: 0,
      contradictionResolutionMs,
    }),
    sessionDurationMs:
      state.completedAt === null ? null : state.completedAt - state.startedAt,
    fieldToControlConflictMs:
      field === undefined || control === undefined
        ? null
        : control.acceptedAt - field.acceptedAt,
    contradictionDetectionMs:
      contradiction === undefined || control === undefined
        ? null
        : contradiction.detectedAt - control.acceptedAt,
    knowledgeDivergenceMs:
      contradiction?.resolvedAt === null ||
      contradiction === undefined ||
      field === undefined
        ? null
        : contradiction.resolvedAt - field.acceptedAt,
    contradictionResolutionMs,
    duplicateInboundCount: state.counters.duplicateInbound,
    staleResponseCount: state.counters.staleResponses,
    clarificationCount: state.counters.clarifications,
    retryCount: state.counters.retries,
  };
}
