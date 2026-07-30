# README_BLUEPRINT.md

Use this as the exact structure for the final `README.md`.

# Signal Fracture

> Chaos engineering for human communication.

Add demo GIF/image.

## 20-second explanation

Explain Field, Control, Director, and the Bay 3 contradiction.

## Demo

- Video URL
- Live dashboard URL
- Agent access instructions
- Screenshot

## Why it exists

Teams test infrastructure failures but not fragmented human knowledge.

## The unforgettable moment

```mermaid
flowchart LR
  T[Field · Telegram<br/>Bay 3 sealed] --> X{Contradiction}
  D[Control · Discord<br/>Route Crew 7 via Bay 3] --> X
  E[Director · Email<br/>Wait for confirmation] --> X
  X --> R[Reconcile and debrief]
```

## Why Caspian is essential

Show:

- Telegram + Discord + Email;
- one `onMessage`;
- private conversation IDs;
- proactive cross-channel injects;
- real event evidence.

## How it works

```mermaid
sequenceDiagram
  participant F as Field / Telegram
  participant C as Control / Discord
  participant D as Director / Email
  participant K as Caspian
  participant H as One Handler
  participant S as Scenario Engine
  participant V as Convex

  F->>K: JOIN / decision
  C->>K: JOIN / decision
  D->>K: JOIN / decision
  K->>H: normalized messages
  H->>V: durable events
  V->>S: facts + role knowledge
  S->>V: consequences + contradiction
  H->>K: targeted reconciliation injects
  K-->>F: private field prompt
  K-->>C: private control prompt
  K-->>D: private director prompt
```

## Deterministic AI boundary

- Gemini: choice classification and report prose
- Code: facts, transitions, contradictions, metrics
- Convex: atomic state and idempotency

## Architecture

Include diagram and stack.

## Caspian compliance

| Requirement           | Evidence        |
| --------------------- | --------------- |
| SDK                   | source/package  |
| 2+ channels           | live evidence   |
| One handler           | source link     |
| Real inbound/outbound | IDs/screenshots |
| Public repo           | URL             |
| Demo                  | URL             |
| Live ready            | rehearsal log   |

## Reliability

- checkpoint;
- replay;
- dedup;
- outbox;
- retry;
- text fallback;
- model outage;
- channel failure.

## Privacy and safety

Fictional-only, role privacy, data minimization, no real operations.

## Metrics

Use real values.

## Setup

Exact fresh-clone commands.

## Channel setup

Email, Telegram, Discord.

## Environment

Link `.env.example`.

## Tests

```bash
bun run check
ENABLE_LIVE_TESTS=true ENABLE_LIVE_SENDS=true bun run test:live
```

## Repository map

Explain folders.

## Known limitations

- one fixed scenario;
- no real emergency use;
- rich interactions optional;
- one worker;
- hosted gateway dependent;
- prototype.

## Buildathon declaration

State event-window code and permitted AI coding assistance.

## License
