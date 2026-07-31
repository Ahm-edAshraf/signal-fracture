# PRODUCT_SPEC.md — Signal Fracture

## Product promise

Signal Fracture tests whether a team can coordinate when information is fragmented across real communication channels.

It is not an alerting bot and not a shared-chat game. It maintains:

- one authoritative fictional world state;
- a separate knowledge state for each role;
- private role-specific injects;
- causal consequences from participant decisions;
- explicit communication faults;
- a complete evidence timeline.

## Canonical fictional scenario

**Asteria Station: Bay 3 Pressure Event**

Every message begins:

> EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY

Roles:

1. Field Engineer — Telegram
2. Mission Control — Discord
3. Operations Director — Email

## Main flow

1. Operator creates a session.
2. System creates signed, expiring role join codes.
3. Participants send:
   - `JOIN ASTERIA FIELD <code>`
   - `JOIN ASTERIA CONTROL <code>`
   - `JOIN ASTERIA DIRECTOR <code>`
4. Single handler binds each Caspian conversation to one role.
5. Operator starts the drill.
6. Engine issues role-specific injects.
7. Participants reply by text.
8. Deterministic parser runs first.
9. Gemini maps natural wording only when needed.
10. Scenario engine applies consequences.
11. Contradiction engine compares world truth, role knowledge, and decisions.
12. Agent sends reconciliation injects.
13. Session ends and report is generated.

## Participant commands

All commands are case-insensitive.

```text
HELP
STATUS
JOIN <scenario> <role> <code>
SEAL BAY 3
INSPECT
WAIT
ROUTE BAY 3
ROUTE BAY 5
NOTIFY COMMANDER
WAIT FOR CONFIRMATION
REROUTE BAY 5
REQUEST OVERRIDE
ESCALATE NOW
ACK <inject-code>
ABORT
LEAVE
```

The active inject defines the allowed decision set. Natural language such as “seal it immediately” may map to `SEAL_BAY_3` only when confidence is sufficient.

## Roles

### Operator

Can:

- create/reset demo session;
- inspect all state;
- start, pause, resume, abort;
- see delivery status;
- export report.

Cannot:

- impersonate participants;
- approve participant decisions;
- mark a failed delivery successful;
- edit historical events.

### Participant

Can:

- join one assigned role;
- receive private injects;
- answer active decisions;
- request known facts;
- abort participation.

### Agent

Must:

- enforce role binding;
- keep knowledge private;
- apply deterministic rules;
- ask clarification safely;
- detect contradictions;
- track delivery;
- preserve an audit trail.

## State machine

Session:

```text
DRAFT
-> READY
-> RUNNING
-> PAUSED
-> RESOLVING
-> COMPLETED

RUNNING/PAUSED/RESOLVING
-> ABORTED
-> FAILED
```

Inject:

```text
PLANNED
-> QUEUED
-> SENT
-> DELIVERED
-> OPEN
-> ANSWERED
-> CLOSED

QUEUED/SENT
-> RETRYING
-> FAILED

OPEN
-> EXPIRED
-> CANCELLED
```

Decision:

```text
RECEIVED
-> PARSED
-> CLARIFICATION_REQUIRED
-> ACCEPTED
-> APPLIED

RECEIVED/PARSED
-> REJECTED_STALE
-> REJECTED_UNAUTHORIZED
-> REJECTED_INVALID
```

Contradiction:

```text
DETECTED
-> NOTIFIED
-> ACKNOWLEDGED
-> RESOLVED
```

## Knowledge model

A fact has:

- canonical fact ID;
- value;
- world version;
- source event;
- created timestamp;
- valid-from timestamp;
- optional superseded timestamp.

Each role knowledge record includes:

- role ID;
- fact ID;
- observed value;
- observed world version;
- learned timestamp;
- source inject/delivery;
- confidence/quality label.

A role can hold a stale value without modifying global truth.

## Communication fault types

P0:

- delayed inject;
- omitted fact;
- stale fact;
- conflicting instruction;
- escalation delay.

P1:

- duplicate message;
- degraded delivery;
- ambiguous wording;
- reordered non-critical inject.

Do not simulate real network compromise or real emergency content.

## Contradiction types

P0 deterministic rules:

1. `ACTION_VS_WORLD_STATE`
2. `ACTION_VS_OTHER_ACTION`
3. `STALE_KNOWLEDGE_ACTION`
4. `MISSING_REQUIRED_ESCALATION`
5. `ROLE_EXPECTATION_MISMATCH`

Canonical contradiction:

```text
world.bay3.access = SEALED
decision.control.route = BAY_3
=> ACTION_VS_WORLD_STATE
```

## Delivery semantics

- Inject is successful only after Caspian send returns success and evidence is stored.
- Delivery attempts have stable keys.
- A required failed inject pauses the dependent branch.
- The dashboard distinguishes queued, sent, delivered, failed, and acknowledged.
- No silent cross-channel substitution.

## Terminal semantics

- All answered initial injects without a contradiction complete safely and cancel unused reconciliation work.
- A detected contradiction always opens reconciliation after the Director answers an allowed D1 choice.
- The fixed safe reconciliation trio resolves and completes; a fully answered unsafe trio fails explicitly.
- Completed and failed sessions close answered injects, cancel unused planned injects, clear active role pointers, and write the deterministic report.

## Clarification policy

Ask one concise clarification when:

- no allowed choice is identified;
- multiple choices appear;
- quoted email text contaminates the answer;
- confidence is below threshold.

After two failed attempts, send the explicit valid options.

## Error behavior

### Duplicate event

No-op after returning the stored outcome.

### Stale answer

Reply:

> That decision prompt is already closed. Your current active prompt is: …

### Model outage

Commands still work. Natural-language input receives the explicit options.

### Channel failure

Record failure, retry safely, pause dependent branch, surface it.

### Restart

Replay after saved checkpoint. Idempotency prevents repeated consequences.

## Dashboard requirements

- channel health;
- role/channel mapping;
- global world facts;
- per-role knowledge;
- inject timeline;
- decision timeline;
- contradiction graph;
- delivery status and latency;
- Caspian event IDs;
- dedupe/retry metrics;
- after-action report.

## Success metrics

Canonical demo target:

- 3 real channels connected;
- 3 real participants bound;
- 3 role-specific decision injects;
- 1 contradiction detected;
- contradiction detection under 1 second after accepted decision;
- 3 reconciliation messages;
- 0 duplicate consequences;
- complete who-knew-what-when timeline;
- 10/10 rehearsals.

## Explicit non-goals

- open-ended autonomous roleplay;
- general enterprise incident management;
- real emergency response;
- real control-system integration;
- participant social network;
- payments;
- live voice calls;
- user-generated unsafe scenarios;
- complex scenario editor before submission.
