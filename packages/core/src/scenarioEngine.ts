import type {
  DecisionInput,
  DecisionKey,
  KnowledgeFact,
  RoleKey,
  ScenarioState,
  TransitionResult,
} from "./domain";
import { detectCanonicalContradiction } from "./contradictionEngine";

function recordFact(
  state: ScenarioState,
  key: string,
  value: unknown,
  input: DecisionInput,
): void {
  const prior = state.facts[key];
  state.facts[key] = {
    key,
    value,
    version: (prior?.version ?? 0) + 1,
    sourceEventId: input.inboundEventId,
    validFrom: input.at,
  };
}

function teach(
  state: ScenarioState,
  role: RoleKey,
  factKey: string,
  sourceInjectKey: string,
  at: number,
): void {
  const fact = state.facts[factKey];
  if (fact === undefined) return;
  const knowledge: KnowledgeFact = {
    role,
    factKey,
    observedValue: fact.value,
    worldVersionObserved: fact.version,
    learnedAt: at,
    sourceInjectKey,
    stale: false,
  };
  state.knowledge[role].push(knowledge);
}

function openInject(
  state: ScenarioState,
  key: string,
  at: number,
  opened: string[],
): void {
  const inject = state.injects[key];
  if (inject === undefined || inject.status !== "planned") return;
  inject.status = "open";
  inject.openedAt = at;
  inject.version += 1;
  state.activeInjectByRole[inject.role] = key;
  opened.push(key);
}

function latestDecision(state: ScenarioState, decision: DecisionKey): boolean {
  return state.decisions.some((item) => item.decision === decision);
}

function maybeOpenReconciliation(
  state: ScenarioState,
  at: number,
  opened: string[],
): void {
  const contradiction = state.contradictions.find(
    ({ key }) => key === "C-BAY3",
  );
  const directorAnswered = state.injects.D1?.status === "answered";
  if (contradiction === undefined || !directorAnswered) return;
  openInject(state, "RF1", at, opened);
  openInject(state, "RC1", at, opened);
  openInject(state, "RD1", at, opened);
  contradiction.status = "notified";
  contradiction.notifiedAt ??= at;
  state.status = "resolving";
}

function maybeComplete(state: ScenarioState, at: number): void {
  const contradiction = state.contradictions.find(
    ({ key }) => key === "C-BAY3",
  );
  const initialAnswered = ["F1", "C1", "D1"].every(
    (key) => state.injects[key]?.status === "answered",
  );
  const safelyResolved =
    latestDecision(state, "PASSAGE_BLOCKED") &&
    latestDecision(state, "REROUTE_BAY_5") &&
    latestDecision(state, "ESCALATE_NOW");
  const reconciliationAnswered = ["RF1", "RC1", "RD1"].every(
    (key) => state.injects[key]?.status === "answered",
  );
  if (contradiction === undefined && !initialAnswered) return;
  if (
    contradiction !== undefined &&
    !safelyResolved &&
    !reconciliationAnswered
  ) {
    return;
  }
  if (contradiction !== undefined && safelyResolved) {
    contradiction.status = "resolved";
    contradiction.resolvedAt ??= at;
  }
  state.status =
    contradiction === undefined || safelyResolved ? "completed" : "failed";
  state.completedAt = at;
  for (const inject of Object.values(state.injects)) {
    if (inject.status === "answered") inject.status = "closed";
    else if (inject.status === "planned") inject.status = "cancelled";
  }
  state.activeInjectByRole = { field: null, control: null, director: null };
}

function applyConsequence(state: ScenarioState, input: DecisionInput): void {
  switch (input.decision) {
    case "SEAL_BAY_3":
      recordFact(state, "bay3.access", "SEALED", input);
      teach(state, "field", "bay3.access", input.injectKey, input.at);
      break;
    case "INSPECT":
      recordFact(state, "bay3.sensorConfidence", 0.92, input);
      teach(state, "field", "bay3.sensorConfidence", input.injectKey, input.at);
      break;
    case "ROUTE_BAY_3":
      recordFact(state, "crew7.route", "BAY_3", input);
      break;
    case "ROUTE_BAY_5":
    case "REROUTE_BAY_5":
      recordFact(state, "crew7.route", "BAY_5", input);
      teach(state, "control", "bay3.access", input.injectKey, input.at);
      break;
    case "NOTIFY_COMMANDER":
    case "ESCALATE_NOW":
      recordFact(state, "commander.notified", true, input);
      recordFact(state, "incident.escalation", "ESCALATED", input);
      break;
    case "WAIT_FOR_CONFIRMATION":
    case "HOLD":
      recordFact(state, "incident.escalation", "DELAYED", input);
      break;
    case "PASSAGE_BLOCKED":
      teach(state, "field", "bay3.access", input.injectKey, input.at);
      break;
    case "PASSAGE_AVAILABLE":
    case "REQUEST_OVERRIDE":
    case "WAIT":
      break;
  }
}

export function applyDecision(
  current: ScenarioState,
  input: DecisionInput,
): TransitionResult {
  const state = structuredClone(current);
  const openedInjects: string[] = [];
  const detectedContradictions: string[] = [];

  if (
    state.decisions.some(
      ({ inboundEventId }) => inboundEventId === input.inboundEventId,
    )
  ) {
    state.counters.duplicateInbound += 1;
    return {
      state,
      outcome: "duplicate",
      openedInjects,
      detectedContradictions,
    };
  }

  if (!["running", "resolving"].includes(state.status)) {
    return {
      state,
      outcome: "unauthorized",
      openedInjects,
      detectedContradictions,
    };
  }

  const inject = state.injects[input.injectKey];
  if (
    inject === undefined ||
    inject.status !== "open" ||
    inject.version !== input.expectedInjectVersion ||
    state.activeInjectByRole[input.role] !== input.injectKey
  ) {
    state.counters.staleResponses += 1;
    return { state, outcome: "stale", openedInjects, detectedContradictions };
  }
  if (inject.role !== input.role) {
    return {
      state,
      outcome: "unauthorized",
      openedInjects,
      detectedContradictions,
    };
  }
  if (!inject.allowedDecisions.includes(input.decision)) {
    return { state, outcome: "invalid", openedInjects, detectedContradictions };
  }

  const decisionId = `decision:${input.inboundEventId}`;
  state.decisions.push({
    id: decisionId,
    inboundEventId: input.inboundEventId,
    role: input.role,
    injectKey: input.injectKey,
    decision: input.decision,
    parseMethod: input.parseMethod,
    acceptedAt: input.at,
  });
  inject.status = "answered";
  inject.answeredAt = input.at;
  inject.version += 1;
  state.activeInjectByRole[input.role] = null;
  applyConsequence(state, input);

  if (input.injectKey === "F1")
    openInject(state, "C1", input.at, openedInjects);

  const contradiction = detectCanonicalContradiction(state, input.at);
  if (contradiction !== null) {
    state.contradictions.push(contradiction);
    detectedContradictions.push(contradiction.key);
  }
  maybeOpenReconciliation(state, input.at, openedInjects);
  maybeComplete(state, input.at);
  state.version += 1;
  state.audit.push({
    type: "decision.applied",
    at: input.at,
    refs: [decisionId, input.injectKey],
    safeMetadata: { role: input.role, decision: input.decision },
  });

  return { state, outcome: "applied", openedInjects, detectedContradictions };
}

export function abortScenario(
  current: ScenarioState,
  at: number,
): ScenarioState {
  if (["completed", "aborted", "failed"].includes(current.status))
    return current;
  const state = structuredClone(current);
  state.status = "aborted";
  state.completedAt = at;
  for (const inject of Object.values(state.injects)) {
    if (
      ["planned", "queued", "sent", "delivered", "open", "retrying"].includes(
        inject.status,
      )
    ) {
      inject.status = "cancelled";
      inject.version += 1;
    }
  }
  state.activeInjectByRole = { field: null, control: null, director: null };
  state.version += 1;
  state.audit.push({ type: "session.aborted", at, refs: [], safeMetadata: {} });
  return state;
}
