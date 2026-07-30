import type {
  DecisionKey,
  InjectState,
  KnowledgeFact,
  RoleKey,
  ScenarioState,
  WorldFact,
} from "../domain";

export const ASTERIA_SCENARIO_ID = "asteria-bay3-v1" as const;

export const ASTERIA_INJECTS = {
  F1: { role: "field", allowed: ["SEAL_BAY_3", "INSPECT", "WAIT"] },
  C1: { role: "control", allowed: ["ROUTE_BAY_3", "ROUTE_BAY_5"] },
  D1: {
    role: "director",
    allowed: ["NOTIFY_COMMANDER", "WAIT_FOR_CONFIRMATION"],
  },
  RF1: {
    role: "field",
    allowed: ["PASSAGE_BLOCKED", "PASSAGE_AVAILABLE"],
  },
  RC1: {
    role: "control",
    allowed: ["REROUTE_BAY_5", "REQUEST_OVERRIDE"],
  },
  RD1: { role: "director", allowed: ["ESCALATE_NOW", "HOLD"] },
} as const satisfies Record<
  string,
  { role: RoleKey; allowed: readonly DecisionKey[] }
>;

function worldFact(
  key: string,
  value: unknown,
  version: number,
  now: number,
): WorldFact {
  return {
    key,
    value,
    version,
    sourceEventId: "scenario:initial",
    validFrom: now,
  };
}

function knowledgeFact(
  role: RoleKey,
  factKey: string,
  observedValue: unknown,
  worldVersionObserved: number,
  now: number,
  stale = false,
): KnowledgeFact {
  return {
    role,
    factKey,
    observedValue,
    worldVersionObserved,
    learnedAt: now,
    sourceInjectKey: null,
    stale,
  };
}

function inject(
  key: keyof typeof ASTERIA_INJECTS,
  status: InjectState["status"],
  now: number,
): InjectState {
  const definition = ASTERIA_INJECTS[key];
  return {
    key,
    role: definition.role,
    status,
    allowedDecisions: [...definition.allowed],
    version: 1,
    openedAt: status === "open" ? now : null,
    answeredAt: null,
  };
}

export function createAsteriaState(now = Date.now()): ScenarioState {
  const facts = Object.fromEntries(
    [
      worldFact("bay3.pressureTrend", "RISING", 1, now),
      worldFact("bay3.sensorConfidence", 0.71, 1, now),
      worldFact("bay3.access", "OPEN", 1, now),
      worldFact("bay5.access", "OPEN", 1, now),
      worldFact("crew7.location", "STAGING", 1, now),
      worldFact("crew7.route", null, 1, now),
      worldFact("commander.notified", false, 1, now),
      worldFact("incident.escalation", "PENDING_CONFIRMATION", 1, now),
    ].map((fact) => [fact.key, fact]),
  );

  return {
    scenarioId: ASTERIA_SCENARIO_ID,
    status: "running",
    version: 1,
    startedAt: now,
    completedAt: null,
    facts,
    knowledge: {
      field: [
        knowledgeFact("field", "bay3.pressureTrend", "RISING", 1, now),
        knowledgeFact("field", "bay3.sensorConfidence", 0.71, 1, now),
        knowledgeFact("field", "bay3.access", "OPEN", 1, now),
      ],
      control: [
        knowledgeFact("control", "bay3.access", "OPEN", 1, now, true),
        knowledgeFact("control", "bay5.access", "OPEN", 1, now),
        knowledgeFact("control", "crew7.location", "STAGING", 1, now),
      ],
      director: [
        knowledgeFact("director", "bay3.pressureTrend", "RISING", 1, now),
        knowledgeFact(
          "director",
          "incident.escalation",
          "PENDING_CONFIRMATION",
          1,
          now,
        ),
      ],
    },
    injects: {
      F1: inject("F1", "open", now),
      C1: inject("C1", "planned", now),
      D1: inject("D1", "open", now),
      RF1: inject("RF1", "planned", now),
      RC1: inject("RC1", "planned", now),
      RD1: inject("RD1", "planned", now),
    },
    activeInjectByRole: { field: "F1", control: null, director: "D1" },
    decisions: [],
    contradictions: [],
    audit: [
      {
        type: "session.started",
        at: now,
        refs: [],
        safeMetadata: { scenarioId: ASTERIA_SCENARIO_ID },
      },
    ],
    counters: {
      duplicateInbound: 0,
      staleResponses: 0,
      clarifications: 0,
      retries: 0,
    },
  };
}
