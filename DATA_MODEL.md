# DATA_MODEL.md — Convex Schema

## Design principles

- Durable, normalized causal state
- Atomic transitions
- Explicit versions
- Stable idempotency
- Public-safe aliases
- Raw private content minimized

## Tables

### `sessions`

```ts
{
  scenarioId: string,
  publicCode: string,
  status: "draft" | "ready" | "running" | "paused" | "resolving" | "completed" | "aborted" | "failed",
  version: number,
  demoTenant: string,
  startedAt?: number,
  completedAt?: number,
  createdAt: number,
  updatedAt: number
}
```

Indexes:

- by public code
- by demo tenant/status
- by updated time

### `roles`

```ts
{
  sessionId: Id<"sessions">,
  roleKey: "field" | "control" | "director",
  displayName: string,
  publicAlias: string,
  joinCodeHash: string,
  joinCodeExpiresAt: number,
  status: "unassigned" | "joined" | "active" | "left" | "completed",
  currentInjectId?: Id<"injects">,
  version: number,
  createdAt: number,
  updatedAt: number
}
```

Unique logical key: session + roleKey.

### `endpoints`

```ts
{
  sessionId: Id<"sessions">,
  roleId: Id<"roles">,
  channel: string,
  conversationId: string,
  connectionId: string,
  senderFingerprint: string,
  active: boolean,
  joinedAt: number,
  lastSeenAt: number
}
```

Indexes:

- by conversation ID
- by role/active
- by session/channel

### `worldFacts`

```ts
{
  sessionId: Id<"sessions">,
  factKey: string,
  value: unknown,
  version: number,
  sourceEventId: string,
  validFrom: number,
  supersededAt?: number,
  createdAt: number
}
```

Index: session + factKey + version.

### `roleKnowledge`

```ts
{
  sessionId: Id<"sessions">,
  roleId: Id<"roles">,
  factKey: string,
  observedValue: unknown,
  worldVersionObserved: number,
  sourceInjectId?: Id<"injects">,
  learnedAt: number,
  stale: boolean
}
```

Index: role + factKey + learnedAt.

### `injects`

```ts
{
  sessionId: Id<"sessions">,
  injectKey: string,
  roleId: Id<"roles">,
  status: "planned" | "queued" | "sent" | "delivered" | "open" | "answered" | "closed" | "retrying" | "failed" | "expired" | "cancelled",
  exerciseText: string,
  emailSubject?: string,
  allowedDecisions: string[],
  prerequisiteKeys: string[],
  faultType?: "delay" | "omission" | "stale_fact" | "conflict" | "escalation_delay",
  opensAt?: number,
  closesAt?: number,
  version: number,
  createdAt: number,
  updatedAt: number
}
```

Unique logical key: session + injectKey.

### `decisions`

```ts
{
  sessionId: Id<"sessions">,
  roleId: Id<"roles">,
  injectId: Id<"injects">,
  inboundEventId: string,
  canonicalDecision?: string,
  rawTextRedacted: string,
  parseMethod: "command" | "phrase" | "gemini" | "clarification",
  confidence?: number,
  status: "received" | "parsed" | "clarification_required" | "accepted" | "applied" | "rejected_stale" | "rejected_invalid" | "rejected_unauthorized",
  appliedAt?: number,
  createdAt: number
}
```

Indexes:

- unique inboundEventId
- inject + role
- session + createdAt

### `contradictions`

```ts
{
  sessionId: Id<"sessions">,
  contradictionKey: string,
  type: "ACTION_VS_WORLD_STATE" | "ACTION_VS_OTHER_ACTION" | "STALE_KNOWLEDGE_ACTION" | "MISSING_REQUIRED_ESCALATION" | "ROLE_EXPECTATION_MISMATCH",
  status: "detected" | "notified" | "acknowledged" | "resolved",
  factRefs: string[],
  decisionRefs: Id<"decisions">[],
  detectedAt: number,
  notifiedAt?: number,
  resolvedAt?: number,
  details: unknown
}
```

Unique logical key: session + contradictionKey.

### `inboundEvents`

```ts
{
  caspianEventId: string,
  messageId: string,
  conversationIdHash: string,
  channel: string,
  sessionId?: Id<"sessions">,
  roleId?: Id<"roles">,
  status: "claimed" | "processed" | "failed",
  outcomeRef?: string,
  receivedAt: number,
  processedAt?: number
}
```

Unique lookup by Caspian message/event ID.

### `deliveries`

```ts
{
  idempotencyKey: string,
  sessionId: Id<"sessions">,
  roleId: Id<"roles">,
  injectId?: Id<"injects">,
  semanticType: string,
  conversationId: string,
  channel: string,
  payload: {
    text: string,
    html?: string,
    blocks?: unknown[],
    media?: unknown[]
  },
  status: "pending" | "claimed" | "sent" | "failed" | "cancelled",
  attempts: number,
  nextAttemptAt: number,
  providerMessageId?: string,
  lastErrorCode?: string,
  createdAt: number,
  updatedAt: number
}
```

Unique lookup by idempotency key.

### `eventCheckpoints`

```ts
{
  key: "caspian",
  lastSeq: number,
  updatedAt: number
}
```

### `auditEvents`

```ts
{
  sessionId?: Id<"sessions">,
  type: string,
  actorType: "participant" | "operator" | "agent" | "system",
  roleId?: Id<"roles">,
  injectId?: Id<"injects">,
  decisionId?: Id<"decisions">,
  contradictionId?: Id<"contradictions">,
  safeMetadata: unknown,
  createdAt: number
}
```

### `reports`

```ts
{
  sessionId: Id<"sessions">,
  metrics: unknown,
  deterministicSummary: string,
  narrative?: string,
  generatedAt: number
}
```

## Atomic mutations

Required:

- claim inbound event;
- join role by valid code;
- accept decision with expected inject version;
- apply transition and create world facts;
- detect/create contradiction exactly once;
- enqueue stable deliveries;
- claim delivery;
- mark delivery outcome;
- save checkpoint monotonically;
- abort session;
- reset demo tenant safely.

## Retention

- Synthetic scenario state can remain.
- Raw participant text should be redacted or deleted after parsing.
- Addresses/usernames must not appear in public queries.
- Demo reset affects only the configured demo tenant.
