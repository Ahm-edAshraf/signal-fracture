# AGENTS.md — Signal Fracture

This is the highest-priority repository instruction for Codex.

## Mission

Build **Signal Fracture**, a complete, deployed, submission-ready Caspian Buildathon project.

Signal Fracture is a fictional crisis-coordination drill engine. It privately gives different roles incomplete, stale, delayed, or conflicting facts through different communication channels. It records their decisions, applies deterministic consequences, detects communication contradictions, and produces an auditable **who knew what, when** report.

The canonical scenario is **Asteria Station: Bay 3 Pressure Event**:

- Field Engineer uses Telegram.
- Mission Control uses Discord.
- Operations Director uses Email.
- Field seals Bay 3.
- Control, using stale information, routes Crew 7 through Bay 3.
- Director delays escalation.
- The system detects the conflict and sends private reconciliation prompts.
- The dashboard displays the causal fault and after-action timeline.

## Read order

Before editing code, read:

1. `00_READ_FIRST.md`
2. `AGENTS.md`
3. `PRODUCT_SPEC.md`
4. `SCENARIO_SPEC.md`
5. `ARCHITECTURE.md`
6. `DATA_MODEL.md`
7. `CASPIAN_COMPLIANCE.md`
8. `PLAN.md`
9. `TASKS.md`
10. `TESTING.md`
11. `DEMO.md`
12. `ENVIRONMENT.md`
13. `SECURITY.md`
14. `SUBMISSION_STRATEGY.md`
15. `README_BLUEPRINT.md`
16. `FINAL_RESEARCH_REPORT.md`
17. `SDK_TECHNICAL_AUDIT.md`

Also inspect:

- the uploaded/local Caspian SDK snapshot if present;
- the currently installed `caspian-sdk` package types;
- the live guide at `https://api.trycaspianai.com/SKILL.md`;
- authenticated `GET /v1/channels`.

The installed package types and authenticated hosted-gateway behavior override planning assumptions.

## Non-negotiable buildathon constraints

- Use the official `caspian-sdk`.
- Use at least two real supported communication channels.
- Target Telegram + Discord + Email.
- Register exactly one shared inbound `client.onMessage(...)` handler.
- Do not duplicate business handlers by channel.
- Real incoming and outgoing communication must work.
- Production/demo integrations may not be mocked.
- Public GitHub repository.
- Demo video under the official limit.
- Live finalist demonstration must be possible.
- All original project code must be written during the event window.
- Never claim an unverified channel or feature works.

## Core product invariants

1. **Exercise-only.** Every participant-facing inject starts with:
   `EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY`.
2. **One world, separate knowledge.** Global truth and each role's known facts are distinct data structures.
3. **Deterministic consequences.** Scenario transitions, contradictions, deadlines, retries, and scoring are code—not LLM decisions.
4. **Conservative language parsing.** Gemini may classify a participant's reply into an allowed decision. It may not invent facts, decisions, roles, or branches.
5. **No false delivery.** A role is not considered informed until a real delivery is confirmed or explicitly recorded as degraded.
6. **Idempotency.** One inbound event causes at most one decision, one transition, and one logical outbound effect.
7. **Durable correctness.** No critical state exists only in process memory.
8. **Text-first controls.** Buttons, reactions, blocks, and media are enhancements. Every judged action works through text.
9. **Channel-neutral domain logic.** Channel etiquette belongs in a presentation adapter.
10. **Auditable causality.** Every fact, inject, decision, consequence, contradiction, and delivery has timestamps and source references.

## Preferred stack

- TypeScript, strict mode
- Bun workspaces
- Persistent Node/Bun agent worker
- `caspian-sdk`
- Convex
- Next.js + React
- Zod
- Gemini through a small provider adapter
- Primary display model: Gemini 3.5 Flash Lite
- Fallback display model: Gemini 3.1 Flash Lite
- Exact API model IDs configured through environment variables after verification
- Vitest
- Playwright only for critical dashboard flows
- Railway/Fly.io/Render worker
- Vercel web deployment

Do not add Redis, Supabase, a vector database, LangGraph, Temporal, Kafka, or another workflow product unless a proven blocker requires it.

## Required repository structure

```text
signal-fracture/
├─ AGENTS.md
├─ README.md
├─ apps/
│  ├─ agent/
│  └─ web/
├─ packages/
│  ├─ core/
│  ├─ ai/
│  ├─ caspian/
│  └─ shared/
├─ convex/
├─ tests/
│  ├─ fixtures/
│  ├─ integration/
│  └─ live/
└─ docs/
   ├─ DECISIONS.md
   ├─ MANUAL_ACTIONS.md
   ├─ LIVE_TEST_EVIDENCE.md
   ├─ SUBMISSION_CHECKLIST.md
   └─ architecture.*
```

## Caspian implementation rules

- Instantiate one `CommClient`.
- Connect configured channels before starting dispatch.
- Register one `client.onMessage(...)` function.
- Normalize every inbound message into one internal envelope.
- Use `message.reply(...)` for immediate, same-thread responses.
- Use `client.sendMessage(conversationId, ...)` for planned injects to known conversations.
- Store:
  - `message.id`
  - `conversationId`
  - `connectionId`
  - channel
  - sender identity hash
- Do not rely on `listen()`'s default latest-sequence startup for durable recovery.
- Prefer a durable polling loop built around `dispatchPending(savedSeq)`:
  1. load persisted Caspian checkpoint;
  2. dispatch from that checkpoint;
  3. persist the returned sequence;
  4. sleep;
  5. repeat with bounded backoff.
- Accept replay after a crash and eliminate duplicate effects through Convex idempotency.
- Use one worker instance for the judged build.
- Rich blocks/interactions must be capability-gated and optional.
- Email quote stripping must happen before decision parsing.
- Persistent-worker deployment is required; serverless SDK dispatch is not assumed.

## Domain boundaries

### Gemini may

- classify natural language into one of the active inject's allowed decisions;
- extract a concise participant rationale;
- detect that clarification is needed;
- generate a short after-action narrative from deterministic metrics;
- adapt wording length and tone by channel.

### Gemini may not

- create or modify world facts;
- choose the next scenario transition;
- decide that a contradiction exists;
- mark delivery successful;
- assign a participant;
- approve an action;
- execute real-world operations;
- create a new branch outside the scenario definition.

## Reliability rules

- All inbound processing starts with atomic event deduplication.
- All domain transitions use an expected session/inject version.
- All outbound effects use stable keys.
- Outbox sends are claimed atomically.
- Application retries are bounded.
- Delivery failures appear on the dashboard.
- A required failed inject pauses its branch.
- A stale response never mutates state.
- A total Gemini outage must not break commands or deterministic decisions.
- `ABORT` always works without Gemini.
- Restart recovery is part of P0, not polish.

## Quality gate

Create a root command:

```bash
bun run check
```

It must run:

1. formatting check
2. lint
3. TypeScript typecheck
4. unit tests
5. integration tests
6. production builds

Live tests require explicit opt-in:

```bash
ENABLE_LIVE_TESTS=true bun run test:live
```

No test may message a real account by default.

## Autonomous workflow

Work through `PLAN.md` and update `TASKS.md` truthfully.

At every milestone:

1. implement a vertical slice;
2. run checks;
3. record decisions;
4. update evidence;
5. fix failures before optional work;
6. commit coherent changes if Git is available.

When a human action is unavoidable:

- finish every non-blocked task first;
- put exact steps in `docs/MANUAL_ACTIONS.md`;
- ask only for the specific token, click, invite, DNS step, account, or deployment authorization needed;
- never invent credentials;
- resume after the human action.

Do not stop at scaffolding, a static dashboard, or mocked channel tests.

## Definition of done

Completion requires:

- real Email and Telegram verified;
- Discord verified unless a documented external blocker forces the two-channel fallback;
- one shared `onMessage` handler;
- stored conversations support proactive real sends;
- the canonical Asteria scenario runs end-to-end;
- three role decisions produce one real contradiction;
- reconciliation messages reach real channels;
- dashboard shows separate role knowledge and global truth;
- after-action report reconstructs who knew what when;
- duplicate, restart, stale response, model outage, and delivery failure paths pass;
- ten consecutive rehearsal runs;
- fresh clone setup verified;
- `bun run check` passes;
- public README, architecture, evidence, screenshots, video script, and Devpost copy are complete;
- no secrets, fake production paths, placeholder claims, or hidden manual state remain.

Do not claim completion before this definition is satisfied.
