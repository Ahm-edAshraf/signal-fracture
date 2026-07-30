import type { ScenarioState } from "./domain";

export type ScenarioMetrics = {
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
  return {
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
    contradictionResolutionMs:
      contradiction?.resolvedAt === null || contradiction === undefined
        ? null
        : contradiction.resolvedAt - contradiction.detectedAt,
    duplicateInboundCount: state.counters.duplicateInbound,
    staleResponseCount: state.counters.staleResponses,
    clarificationCount: state.counters.clarifications,
    retryCount: state.counters.retries,
  };
}
