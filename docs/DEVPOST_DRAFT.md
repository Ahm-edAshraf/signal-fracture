# Devpost draft — Signal Fracture

This copy is publication-ready except for the measured live-rehearsal values and video URL, which must be inserted only after they are verified.

## Title

Signal Fracture — Chaos Engineering for Human Communication

## Tagline

A multi-channel drill engine that exposes how locally rational decisions become globally unsafe when people receive different truths.

## Inspiration

Teams routinely chaos-test servers, queues, and networks. They rarely test the human information paths that connect a real response team. Most tabletop exercises put everyone in one shared room or portal, which removes the exact delays, omissions, stale context, and conflicting messages that cause coordination failures.

Signal Fracture treats communication itself as the system under test.

## What it does

Signal Fracture runs a clearly fictional crisis-coordination exercise through the communication tools participants already use. Each role receives a different, deliberately incomplete view of one shared world. Their decisions are applied by a deterministic scenario engine, checked against global truth and the knowledge available to every role, and reconstructed in an auditable “who knew what, when” report.

The canonical drill is **Asteria Station: Bay 3 Pressure Event**:

- A Field Engineer on Telegram sees rising pressure and seals Bay 3.
- Mission Control on Discord still has a stale route map and sends Crew 7 through Bay 3.
- An Operations Director on Email waits for confirmation before escalating.
- The engine detects the Bay 3 contradiction, sends private reconciliation prompts back through the three real channels, and records how the team resolves it.

The dashboard makes the fracture visible: global world truth sits beside each role's separate knowledge, the causal graph turns red when the unsafe route is created, and the timeline shows every inject, decision, delivery, retry, and contradiction.

## Why Caspian is central

Caspian is the communication plane, not an alerting add-on. One official `CommClient` connects Email, Telegram, and Discord. Exactly one shared `client.onMessage(...)` handler normalizes every participant response and sends it through the same channel-neutral domain logic. Immediate acknowledgements use `message.reply(...)`; planned injects and reconciliation prompts use `client.sendMessage(...)` against conversation IDs captured from real inbound traffic.

The worker persists its Caspian event checkpoint in Convex and polls with `dispatchPending(savedSeq)`. A crash may replay an event, but atomic message claims and stable outbound keys prevent repeated domain consequences.

## How we built it

- **TypeScript + Bun workspaces** for strict shared contracts
- **Official `caspian-sdk` 0.6.1** for the three real channels
- **Convex** for durable sessions, facts, role knowledge, injects, decisions, contradictions, deliveries, checkpoints, audit events, and reports
- **Next.js + React** for the public-safe evidence dashboard and guarded operator console
- **Gemini 3.5 Flash Lite**, with Gemini 3.1 Flash Lite fallback, behind a narrow provider adapter
- **Zod** for model-output validation
- **Vitest, convex-test, and Playwright** for deterministic, atomicity, privacy, and browser checks
- **Railway** for the single persistent worker and **Vercel** for the dashboard

Gemini never owns world state or scenario control. Exact decisions bypass the model. Natural language can only be classified into the active prompt's fixed allowlist. Facts, transitions, contradictions, delivery state, retry policy, scoring, and completion are code. After completion, Gemini may turn an already-frozen deterministic metrics object into short prose; if it fails, the authoritative report remains available.

## Reliability and privacy

- Atomic inbound deduplication before business logic
- Expected inject versions reject stale or concurrent responses
- Atomic outbox claims with bounded retry and branch pause on permanent failure
- Deterministic inject deadlines and a reset-required safety pause on later misses
- Guarded operator pause/resume/abort controls with durable outbox holds and frozen response clocks
- Monotonic durable Caspian checkpoint
- Signed, expiring, single-role join commands
- Email quote stripping before decision parsing
- Exact `ABORT` path that never depends on Gemini
- Public dashboard projection with no address, conversation ID, connection ID, sender payload, raw participant message, or join-code hash
- Server-only Convex operator authority exchanged for a short-lived HttpOnly/SameSite cookie
- Mandatory fictional-exercise banner on participant-facing messages
- Conservative role knowledge recorded only after a participant reply confirms receipt

## Verified results so far

- 3 target channels active: Email, Telegram, and Discord
- Real inbound, same-thread reply, and proactive persisted-conversation send verified on all 3 channels
- Exactly 1 shared `client.onMessage(...)` registration
- Durable production worker healthy with all 3 channels ready
- 39 unit tests, 12 Convex integration tests, and 4 production-browser checks passing
- Fresh public clone passes frozen installation and the complete root quality gate without project secrets
- Canonical deterministic and Convex integration scenarios create and resolve exactly 1 Bay 3 contradiction
- Completed reports have an authenticated, privacy-safe JSON export

The live three-participant rehearsal metrics will be added here after the canonical run. No unverified latency, completion-time, or rehearsal-rate claim will be published.

## Challenges

The hardest part was preserving causality across real communication systems. “API accepted the send” is not the same as “the participant is informed,” and a process can fail between a provider send and the database acknowledgement. Signal Fracture therefore keeps delivery evidence explicit, labels provider acceptance as `sent` instead of inventing a read receipt, pauses required branches on terminal failures, and exposes degraded state on the dashboard.

Another challenge was keeping AI useful without giving it authority. The answer was a deliberately small boundary: the model can interpret wording, but it cannot decide what happened.

## What we learned

A shared portal hides communication failure. Once each participant stays in a real private channel, knowledge becomes a first-class state variable. That makes it possible to explain not only which decision was wrong, but why it looked reasonable to the person who made it.

## What's next

After the buildathon, the same engine could support more fictional scenarios, configurable fault patterns, richer capability-gated interactions, and comparative team-level rehearsal analytics. The near-term priority remains narrower: complete repeated live rehearsals, measure the actual coordination timings, and keep the evidence honest.

## Links

- Live dashboard: <https://signal-fracture.vercel.app>
- Public repository: <https://github.com/Ahm-edAshraf/signal-fracture>
- Architecture: <https://github.com/Ahm-edAshraf/signal-fracture/blob/main/docs/architecture.md>
- Live evidence: <https://github.com/Ahm-edAshraf/signal-fracture/blob/main/docs/LIVE_TEST_EVIDENCE.md>
- Shared handler: <https://github.com/Ahm-edAshraf/signal-fracture/blob/main/apps/agent/src/registerSharedHandler.ts>
- Durable loop: <https://github.com/Ahm-edAshraf/signal-fracture/blob/main/apps/agent/src/durableEventLoop.ts>
- Video: add only after the final privacy-reviewed upload
