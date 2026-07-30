import type {
  ContradictionRecord,
  ContradictionType,
  DecisionRecord,
  ScenarioState,
} from "./domain";

export type ContradictionRule = {
  type: ContradictionType;
  evaluate: (state: ScenarioState) => boolean;
};

function latestDecision(
  state: ScenarioState,
  decision: DecisionRecord["decision"],
): DecisionRecord | undefined {
  return state.decisions.findLast((record) => record.decision === decision);
}

export const CONTRADICTION_RULES: readonly ContradictionRule[] = [
  {
    type: "ACTION_VS_WORLD_STATE",
    evaluate: (state) =>
      state.facts["bay3.access"]?.value === "SEALED" &&
      latestDecision(state, "ROUTE_BAY_3") !== undefined,
  },
  {
    type: "ACTION_VS_OTHER_ACTION",
    evaluate: (state) =>
      latestDecision(state, "SEAL_BAY_3") !== undefined &&
      latestDecision(state, "ROUTE_BAY_3") !== undefined,
  },
  {
    type: "STALE_KNOWLEDGE_ACTION",
    evaluate: (state) =>
      state.knowledge.control.some(
        (fact) => fact.factKey === "bay3.access" && fact.stale,
      ) && latestDecision(state, "ROUTE_BAY_3") !== undefined,
  },
  {
    type: "MISSING_REQUIRED_ESCALATION",
    evaluate: (state) =>
      latestDecision(state, "WAIT_FOR_CONFIRMATION") !== undefined &&
      state.facts["bay3.access"]?.value === "SEALED",
  },
  {
    type: "ROLE_EXPECTATION_MISMATCH",
    evaluate: (state) =>
      latestDecision(state, "PASSAGE_AVAILABLE") !== undefined &&
      state.facts["bay3.access"]?.value === "SEALED",
  },
] as const;

export function evaluateRule(
  type: ContradictionType,
  state: ScenarioState,
): boolean {
  return (
    CONTRADICTION_RULES.find((rule) => rule.type === type)?.evaluate(state) ??
    false
  );
}

export function detectCanonicalContradiction(
  state: ScenarioState,
  at: number,
): ContradictionRecord | null {
  const key = "C-BAY3";
  if (state.contradictions.some((item) => item.key === key)) return null;
  if (!evaluateRule("ACTION_VS_WORLD_STATE", state)) return null;
  const routeDecision = latestDecision(state, "ROUTE_BAY_3");
  if (routeDecision === undefined) return null;
  const fieldDecision = latestDecision(state, "SEAL_BAY_3");
  return {
    key,
    type: "ACTION_VS_WORLD_STATE",
    status: "detected",
    factRefs: ["bay3.access"],
    decisionRefs: [fieldDecision?.id, routeDecision.id].filter(
      (value): value is string => value !== undefined,
    ),
    detectedAt: at,
    notifiedAt: null,
    resolvedAt: null,
    details: {
      sealedAt: fieldDecision?.acceptedAt ?? null,
      routedAt: routeDecision.acceptedAt,
      controlKnowledgeVersion: 1,
      currentWorldVersion: state.facts["bay3.access"]?.version ?? null,
    },
  };
}
