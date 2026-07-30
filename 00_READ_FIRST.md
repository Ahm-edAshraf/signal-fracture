# Signal Fracture — Read This First

This repository brief replaces every previous RelayLoop or translation-bridge brief.

## Final project

**Signal Fracture — Chaos Engineering for Human Communication**

A Caspian agent runs short fictional coordination drills across real communication channels. Each role receives a different subset of facts. Decisions on one channel alter what other roles receive. The system detects contradictions and reconstructs **who knew what, when**.

## Canonical demo

- Field Engineer on Telegram
- Mission Control on Discord
- Operations Director on Email
- One shared Caspian `onMessage` handler
- One durable world state
- One visible contradiction:
  - Field seals Bay 3.
  - Control routes Crew 7 through Bay 3 using stale information.
  - Director delays escalation.
- Agent sends private reconciliation prompts.
- Dashboard produces a causal after-action report.

## Source of truth order

Read and follow these files in order:

1. `AGENTS.md`
2. `PRODUCT_SPEC.md`
3. `SCENARIO_SPEC.md`
4. `ARCHITECTURE.md`
5. `DATA_MODEL.md`
6. `CASPIAN_COMPLIANCE.md`
7. `PLAN.md`
8. `TASKS.md`
9. `TESTING.md`
10. `DEMO.md`
11. `ENVIRONMENT.md`
12. `SECURITY.md`
13. `SUBMISSION_STRATEGY.md`
14. `README_BLUEPRINT.md`
15. `FINAL_RESEARCH_REPORT.md`
16. `SDK_TECHNICAL_AUDIT.md`
17. `SOURCE_INDEX.md`

`AGENTS.md` is the authoritative coding-agent instruction.

## Deadline policy

Devpost pages conflict. Treat the earlier deadline as binding:

- **Hard working deadline:** 12 August 2026 at 2:29 AM Malaysia time
- **Internal submission target:** 11 August 2026 at 6:00 PM Malaysia time
- **Feature freeze:** 10 August 2026 at 12:00 AM Malaysia time

Do not plan around the later banner date unless the organizer confirms it in writing.

## Critical implementation policy

Qualification and real message delivery come before the dashboard.

Do not build the full product until a real spike proves:

1. Email inbound and reply
2. Telegram inbound and reply
3. Both use the same handler
4. Stored `conversationId` supports proactive `sendMessage`
5. Inbound message IDs can be deduplicated
6. State survives restart

## Uploaded SDK snapshot

The research used:

- Caspian SDK commit: `f985ad0f7933321ed82c5d13f0222f6d81bfe228`
- TypeScript package version: `0.6.1`
- Uploaded ZIP SHA-256: `57202d1823b88f6119e0b386c31bda1c8716354fe5a6c2d5856bdefc0f0732b8`

Before implementation, compare the installed npm package and live guide against this snapshot.
