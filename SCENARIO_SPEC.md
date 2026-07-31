# SCENARIO_SPEC.md — Asteria Station

## Safety banner

Prepend exactly:

> EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY

to every participant-facing inject.

## Scenario identity

- Scenario ID: `asteria-bay3-v1`
- Name: `Asteria Station: Bay 3 Pressure Event`
- Duration target: 60–100 seconds in demo mode
- Roles: Field, Control, Director
- Mode: deterministic demo
- Objective: expose a contradiction caused by fragmented information

## Initial authoritative world state

```json
{
  "bay3.pressureTrend": "RISING",
  "bay3.sensorConfidence": 0.71,
  "bay3.access": "OPEN",
  "bay5.access": "OPEN",
  "crew7.location": "STAGING",
  "crew7.route": null,
  "commander.notified": false,
  "incident.escalation": "PENDING_CONFIRMATION"
}
```

## Initial role knowledge

### Field

Knows:

- pressure rising;
- local sensor confidence 71%;
- Bay 3 currently open;
- can seal locally.

Does not know:

- Crew 7 routing request;
- Director escalation policy.

### Control

Knows:

- stale telemetry says Bay 3 appears passable;
- Bay 3 is shorter;
- Bay 5 is safe but slower;
- Crew 7 needs a route.

Does not know:

- Field's latest local decision;
- exact local sensor confidence.

### Director

Knows:

- pressure anomaly exists;
- confirmation is incomplete;
- escalation has operational cost.

Does not know:

- Field has sealed Bay 3;
- Control is selecting a route.

## Timeline and inject graph

### Inject F1 — Field decision

Delivery: Telegram  
Allowed decisions:

- `SEAL_BAY_3`
- `INSPECT`
- `WAIT`

Message:

> Pressure is rising in Bay 3. Local sensor confidence: 71%. Choose: `SEAL BAY 3`, `INSPECT`, or `WAIT`.

Canonical demo choice: `SEAL_BAY_3`

Consequences:

```text
world.bay3.access = SEALED
fact FIELD_SEALED_BAY3 created
Field learns FIELD_SEALED_BAY3
Control does not receive this fact yet
Director does not receive this fact yet
```

### Inject C1 — Control routing

Prerequisite:

- F1 accepted, or demo timeout reached.

Delivery: Discord  
Fault:

- stale fact: `bay3.access = OPEN`

Allowed decisions:

- `ROUTE_BAY_3`
- `ROUTE_BAY_5`

Message:

> Last synchronized map shows Bay 3 passable. Crew 7 needs the shortest route to the cooling manifold. Choose: `ROUTE BAY 3` or `ROUTE BAY 5`.

Canonical demo choice: `ROUTE_BAY_3`

Consequences:

```text
world.crew7.route = BAY_3
decision CONTROL_ROUTE_BAY3 created
run contradiction rules
```

Expected contradiction:

```text
ACTION_VS_WORLD_STATE:
CONTROL_ROUTE_BAY3 conflicts with world.bay3.access = SEALED
```

### Inject D1 — Director escalation

Delivery: Email  
Fault:

- omission of field seal;
- structured slower channel.

Allowed decisions:

- `NOTIFY_COMMANDER`
- `WAIT_FOR_CONFIRMATION`

Subject:

```text
[EXERCISE] Asteria Station pressure anomaly — escalation decision
```

Message body:

> A pressure anomaly has been reported in Bay 3. Confirmation remains incomplete. Decide: `NOTIFY COMMANDER` or `WAIT FOR CONFIRMATION`.

Canonical demo choice: `WAIT_FOR_CONFIRMATION`

Consequences:

```text
world.incident.escalation = DELAYED
possible MISSING_REQUIRED_ESCALATION contradiction
```

## Contradiction C-BAY3

Trigger:

```text
world.bay3.access == SEALED
AND acceptedDecision(Control) == ROUTE_BAY_3
```

Store:

- contradiction type;
- conflicting fact;
- conflicting decision;
- field-known timestamp;
- control-decision timestamp;
- divergence duration;
- channels involved;
- causal source IDs.

## Reconciliation injects

### RF1 — Field confirmation

> Mission Control is routing Crew 7 through Bay 3. Confirm: `PASSAGE BLOCKED` or `PASSAGE AVAILABLE`.

Expected: `PASSAGE_BLOCKED`

### RC1 — Control correction

> Field reports Bay 3 sealed, which conflicts with your Crew 7 route. Choose: `REROUTE BAY 5` or `REQUEST OVERRIDE`.

Expected: `REROUTE_BAY_5`

### RD1 — Director escalation

Subject:

```text
[EXERCISE] Coordination fault detected — escalation required
```

> Crew 7 is routed through Bay 3 while Field reports it sealed. Choose: `ESCALATE NOW` or `HOLD`.

Expected: `ESCALATE_NOW`

## Resolution condition

```text
Field confirms passage blocked
AND Control reroutes to Bay 5
AND Director escalates
```

Final world state:

```json
{
  "bay3.access": "SEALED",
  "bay5.access": "OPEN",
  "crew7.route": "BAY_5",
  "commander.notified": true,
  "incident.escalation": "ESCALATED",
  "contradiction": "RESOLVED"
}
```

## After-action metrics

Compute deterministically:

- session duration;
- time from Field decision to Control conflict;
- time from conflict to detection;
- knowledge divergence duration;
- time to first reconciliation response;
- total time to resolution;
- delivery latency by channel;
- clarification count;
- retries;
- duplicate event count;
- stale response count.
- coordination score from deterministic contradiction, resolution-time, retry, and delivery-failure penalties.

## Deterministic response deadlines

Response windows begin after Caspian accepts the outbound send:

- F1, C1, RF1, and RC1: 120 seconds;
- D1 and RD1: 180 seconds.

F1 expiry opens C1 because its documented prerequisite allows the demo timeout. Any later missed inject is expired and the session enters a reset-required safety pause. An operator-originated pause freezes open response clocks and shifts them by the pause duration on resume.

## Scenario engine contract

The scenario definition should be data-driven, but only this fixed scenario is required.

Recommended shape:

```ts
type ScenarioDefinition = {
  id: string;
  roles: RoleDefinition[];
  initialWorldFacts: FactSeed[];
  initialKnowledge: RoleKnowledgeSeed[];
  injects: InjectDefinition[];
  transitionRules: TransitionRule[];
  contradictionRules: ContradictionRule[];
  completionRule: CompletionRule;
};
```

Do not execute arbitrary code from scenario JSON. Rules are typed identifiers implemented in code.
