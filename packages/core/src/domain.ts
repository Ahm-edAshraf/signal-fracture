export type RoleKey = "field" | "control" | "director";

export type SessionStatus =
  | "draft"
  | "ready"
  | "running"
  | "paused"
  | "resolving"
  | "completed"
  | "aborted"
  | "failed";

export type InjectStatus =
  | "planned"
  | "queued"
  | "sent"
  | "delivered"
  | "open"
  | "answered"
  | "closed"
  | "retrying"
  | "failed"
  | "expired"
  | "cancelled";

export type ParseMethod = "command" | "phrase" | "gemini" | "clarification";

export type DecisionKey =
  | "SEAL_BAY_3"
  | "INSPECT"
  | "WAIT"
  | "ROUTE_BAY_3"
  | "ROUTE_BAY_5"
  | "NOTIFY_COMMANDER"
  | "WAIT_FOR_CONFIRMATION"
  | "PASSAGE_BLOCKED"
  | "PASSAGE_AVAILABLE"
  | "REROUTE_BAY_5"
  | "REQUEST_OVERRIDE"
  | "ESCALATE_NOW"
  | "HOLD";

export type ContradictionType =
  | "ACTION_VS_WORLD_STATE"
  | "ACTION_VS_OTHER_ACTION"
  | "STALE_KNOWLEDGE_ACTION"
  | "MISSING_REQUIRED_ESCALATION"
  | "ROLE_EXPECTATION_MISMATCH";

export type WorldFact = {
  key: string;
  value: unknown;
  version: number;
  sourceEventId: string;
  validFrom: number;
};

export type KnowledgeFact = {
  role: RoleKey;
  factKey: string;
  observedValue: unknown;
  worldVersionObserved: number;
  learnedAt: number;
  sourceInjectKey: string | null;
  stale: boolean;
};

export type InjectState = {
  key: string;
  role: RoleKey;
  status: InjectStatus;
  allowedDecisions: DecisionKey[];
  version: number;
  openedAt: number | null;
  answeredAt: number | null;
};

export type DecisionRecord = {
  id: string;
  inboundEventId: string;
  role: RoleKey;
  injectKey: string;
  decision: DecisionKey;
  parseMethod: ParseMethod;
  acceptedAt: number;
};

export type ContradictionRecord = {
  key: string;
  type: ContradictionType;
  status: "detected" | "notified" | "acknowledged" | "resolved";
  factRefs: string[];
  decisionRefs: string[];
  detectedAt: number;
  notifiedAt: number | null;
  resolvedAt: number | null;
  details: Record<string, unknown>;
};

export type AuditRecord = {
  type: string;
  at: number;
  refs: string[];
  safeMetadata: Record<string, unknown>;
};

export type ScenarioState = {
  scenarioId: "asteria-bay3-v1";
  status: SessionStatus;
  version: number;
  startedAt: number;
  completedAt: number | null;
  facts: Record<string, WorldFact>;
  knowledge: Record<RoleKey, KnowledgeFact[]>;
  injects: Record<string, InjectState>;
  activeInjectByRole: Record<RoleKey, string | null>;
  decisions: DecisionRecord[];
  contradictions: ContradictionRecord[];
  audit: AuditRecord[];
  counters: {
    duplicateInbound: number;
    staleResponses: number;
    clarifications: number;
    retries: number;
  };
};

export type DecisionInput = {
  inboundEventId: string;
  role: RoleKey;
  injectKey: string;
  expectedInjectVersion: number;
  decision: DecisionKey;
  parseMethod: ParseMethod;
  at: number;
};

export type TransitionResult = {
  state: ScenarioState;
  outcome: "applied" | "duplicate" | "stale" | "invalid" | "unauthorized";
  openedInjects: string[];
  detectedContradictions: string[];
};
