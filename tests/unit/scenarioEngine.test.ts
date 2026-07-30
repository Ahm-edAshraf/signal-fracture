import {
  abortScenario,
  applyDecision,
  calculateMetrics,
  createAsteriaState,
  evaluateRule,
  type DecisionInput,
  type DecisionKey,
  type RoleKey,
  type ScenarioState,
} from "@signal-fracture/core";
import { describe, expect, it } from "vitest";

function decide(
  state: ScenarioState,
  role: RoleKey,
  injectKey: string,
  decision: DecisionKey,
  at: number,
  event = `${injectKey}:${decision}:${at}`,
) {
  const inject = state.injects[injectKey];
  if (inject === undefined) throw new Error(`Unknown inject ${injectKey}`);
  const input: DecisionInput = {
    inboundEventId: event,
    role,
    injectKey,
    expectedInjectVersion: inject.version,
    decision,
    parseMethod: "command",
    at,
  };
  return applyDecision(state, input);
}

function canonicalThroughReconciliation(): ScenarioState {
  let state = createAsteriaState(0);
  state = decide(state, "field", "F1", "SEAL_BAY_3", 1_000).state;
  state = decide(state, "control", "C1", "ROUTE_BAY_3", 2_000).state;
  state = decide(state, "director", "D1", "WAIT_FOR_CONFIRMATION", 3_000).state;
  return state;
}

describe("Asteria deterministic scenario", () => {
  it("keeps global truth separate from stale role knowledge", () => {
    const initial = createAsteriaState(0);
    const result = decide(initial, "field", "F1", "SEAL_BAY_3", 1_000);

    expect(result.outcome).toBe("applied");
    expect(result.state.facts["bay3.access"]?.value).toBe("SEALED");
    expect(result.state.knowledge.field.at(-1)?.observedValue).toBe("SEALED");
    expect(result.state.knowledge.control.at(-3)?.observedValue).toBe("OPEN");
    expect(result.state.knowledge.control.at(-3)?.stale).toBe(true);
    expect(result.openedInjects).toEqual(["C1"]);
  });

  it("detects the Bay 3 contradiction exactly once", () => {
    let state = createAsteriaState(0);
    state = decide(state, "field", "F1", "SEAL_BAY_3", 1_000).state;
    const conflict = decide(state, "control", "C1", "ROUTE_BAY_3", 2_000);

    expect(conflict.detectedContradictions).toEqual(["C-BAY3"]);
    expect(conflict.state.contradictions).toHaveLength(1);
    expect(conflict.state.contradictions[0]?.type).toBe(
      "ACTION_VS_WORLD_STATE",
    );

    const replay = decide(
      conflict.state,
      "control",
      "C1",
      "ROUTE_BAY_3",
      2_100,
      "C1:ROUTE_BAY_3:2000",
    );
    expect(replay.outcome).toBe("duplicate");
    expect(replay.state.contradictions).toHaveLength(1);
  });

  it("opens three private reconciliation prompts after the initial decisions", () => {
    const state = canonicalThroughReconciliation();

    expect(state.status).toBe("resolving");
    expect(state.activeInjectByRole).toEqual({
      field: "RF1",
      control: "RC1",
      director: "RD1",
    });
    expect(state.contradictions[0]?.status).toBe("notified");
  });

  it("resolves only after all three deterministic reconciliation decisions", () => {
    let state = canonicalThroughReconciliation();
    state = decide(state, "field", "RF1", "PASSAGE_BLOCKED", 4_000).state;
    state = decide(state, "control", "RC1", "REROUTE_BAY_5", 5_000).state;
    const completed = decide(
      state,
      "director",
      "RD1",
      "ESCALATE_NOW",
      6_000,
    ).state;

    expect(completed.status).toBe("completed");
    expect(completed.facts["bay3.access"]?.value).toBe("SEALED");
    expect(completed.facts["crew7.route"]?.value).toBe("BAY_5");
    expect(completed.facts["commander.notified"]?.value).toBe(true);
    expect(completed.facts["incident.escalation"]?.value).toBe("ESCALATED");
    expect(completed.contradictions[0]?.status).toBe("resolved");

    expect(calculateMetrics(completed)).toMatchObject({
      sessionDurationMs: 6_000,
      fieldToControlConflictMs: 1_000,
      contradictionDetectionMs: 0,
      contradictionResolutionMs: 4_000,
      duplicateInboundCount: 0,
    });
  });

  it("rejects stale and wrong-role decisions without changing facts", () => {
    const state = createAsteriaState(0);
    const stale = applyDecision(state, {
      inboundEventId: "stale",
      role: "field",
      injectKey: "F1",
      expectedInjectVersion: 99,
      decision: "SEAL_BAY_3",
      parseMethod: "command",
      at: 1,
    });
    expect(stale.outcome).toBe("stale");
    expect(stale.state.facts["bay3.access"]?.value).toBe("OPEN");

    const wrongRole = applyDecision(state, {
      inboundEventId: "wrong-role",
      role: "control",
      injectKey: "F1",
      expectedInjectVersion: 1,
      decision: "SEAL_BAY_3",
      parseMethod: "command",
      at: 1,
    });
    expect(wrongRole.outcome).toBe("stale");
    expect(wrongRole.state.facts["bay3.access"]?.value).toBe("OPEN");
  });

  it("implements all five contradiction rule predicates", () => {
    const state = canonicalThroughReconciliation();
    expect(evaluateRule("ACTION_VS_WORLD_STATE", state)).toBe(true);
    expect(evaluateRule("ACTION_VS_OTHER_ACTION", state)).toBe(true);
    expect(evaluateRule("STALE_KNOWLEDGE_ACTION", state)).toBe(true);
    expect(evaluateRule("MISSING_REQUIRED_ESCALATION", state)).toBe(true);

    const mismatch = structuredClone(state);
    mismatch.decisions.push({
      id: "decision:mismatch",
      inboundEventId: "mismatch",
      role: "field",
      injectKey: "RF1",
      decision: "PASSAGE_AVAILABLE",
      parseMethod: "command",
      acceptedAt: 4_000,
    });
    expect(evaluateRule("ROLE_EXPECTATION_MISMATCH", mismatch)).toBe(true);
  });

  it("aborts without model involvement and cancels open injects", () => {
    const aborted = abortScenario(createAsteriaState(0), 100);
    expect(aborted.status).toBe("aborted");
    expect(aborted.activeInjectByRole).toEqual({
      field: null,
      control: null,
      director: null,
    });
    expect(aborted.injects.F1?.status).toBe("cancelled");
    expect(aborted.injects.D1?.status).toBe("cancelled");
  });
});
