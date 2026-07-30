# GOAL_PROMPT.md

Paste the text below immediately after `/goal`:

```text
Build Signal Fracture completely and make it submission-ready for the Caspian Buildathon.

Start by reading every repository instruction file. AGENTS.md is the highest-priority project instruction. Then read 00_READ_FIRST.md, PRODUCT_SPEC.md, SCENARIO_SPEC.md, ARCHITECTURE.md, DATA_MODEL.md, CASPIAN_COMPLIANCE.md, PLAN.md, TASKS.md, TESTING.md, DEMO.md, ENVIRONMENT.md, SECURITY.md, SUBMISSION_STRATEGY.md, README_BLUEPRINT.md, FINAL_RESEARCH_REPORT.md, SDK_TECHNICAL_AUDIT.md, and SOURCE_INDEX.md. Treat all earlier RelayLoop or translation-bridge concepts as withdrawn.

Before implementing channel code, inspect the current https://api.trycaspianai.com/SKILL.md, the installed caspian-sdk TypeScript types and examples, and the authenticated /v1/channels response. The uploaded research snapshot used Caspian SDK commit f985ad0f7933321ed82c5d13f0222f6d81bfe228 and npm version 0.6.1, but installed package types and real hosted-gateway tests override assumptions.

Implement the entire product, not a scaffold.

Signal Fracture is “chaos engineering for human communication.” It runs a clearly fictional coordination drill across real communication channels, deliberately gives each role a different subset of facts, applies deterministic consequences to participant decisions, detects contradictions between local decisions and global truth, sends private reconciliation prompts, and produces a “who knew what, when” after-action report.

The canonical scenario is Asteria Station: Bay 3 Pressure Event:
- Field Engineer uses Telegram.
- Mission Control uses Discord.
- Operations Director uses Email.
- Field receives rising pressure information and chooses SEAL BAY 3.
- Control receives stale information that Bay 3 is passable and chooses ROUTE BAY 3.
- Director receives an incomplete email and chooses WAIT FOR CONFIRMATION.
- The deterministic contradiction engine detects that Crew 7 is being routed through a sealed bay.
- The agent sends role-specific reconciliation prompts.
- Field confirms passage is blocked, Control reroutes to Bay 5, and Director escalates.
- The dashboard reconstructs exactly who knew what and when.

Every participant-facing message must begin with:
EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY

Use:
- strict TypeScript;
- Bun workspaces;
- one persistent Node/Bun agent worker;
- official caspian-sdk;
- Convex;
- Next.js and React;
- Zod;
- Gemini through a narrow provider adapter;
- Gemini 3.5 Flash Lite as the intended primary display model and Gemini 3.1 Flash Lite as the intended fallback, while verifying and configuring the exact API model IDs through environment variables;
- Vitest;
- Playwright only for critical dashboard tests.

Qualification is non-negotiable:
- connect at least real Email and Telegram, targeting Email + Telegram + Discord;
- register exactly one shared client.onMessage handler for all message channels;
- no duplicated channel-specific business handlers;
- use real inbound and outbound communication;
- use message.reply for immediate same-thread replies;
- verify and use client.sendMessage for proactive injects to stored conversations;
- store message.id, conversationId, connectionId, and channel;
- do not mock the judged or demo path;
- keep text commands working on every channel even if buttons are added;
- make all important state durable in Convex;
- make inbound events, decisions, transitions, contradictions, and outbound sends idempotent.

Do not build the full dashboard until the qualification spike proves:
1. real Email inbound and reply;
2. real Telegram inbound and reply;
3. both call the exact same handler;
4. stored conversation IDs support proactive sendMessage;
5. duplicate inbound IDs are harmless;
6. state survives process restart.

Use a durable Caspian checkpoint loop instead of blindly relying on listen()’s default in-memory cursor. Prefer a loop around client.dispatchPending(savedSeq), persist the returned sequence in Convex, tolerate replay after crashes, and rely on atomic inbound idempotency to suppress repeated effects. Use one worker replica. Do not depend on the unpublished serverless webhook-handler feature.

Keep the scenario engine, state machine, contradiction rules, metrics, and allowed choices deterministic and isolated in a pure core package. Gemini may only:
- classify natural-language wording into one of the current inject’s fixed allowed decisions;
- request clarification;
- summarize participant rationale;
- generate a short narrative from deterministic report metrics.

Gemini must never:
- invent or alter world facts;
- choose scenario transitions;
- determine delivery success;
- decide that a contradiction exists;
- assign roles;
- execute real-world actions;
- bypass authorization or safety.

Implement the complete Convex data model and atomic mutations described in DATA_MODEL.md, including sessions, roles, endpoints, world facts, role knowledge, injects, decisions, contradictions, inbound events, deliveries/outbox, Caspian checkpoint, audit events, and reports.

Implement:
- signed, expiring role codes;
- JOIN, HELP, STATUS, ABORT, and all canonical scenario commands;
- email quoted-reply stripping before parsing;
- exact command and phrase parsing before Gemini;
- stale-response rejection;
- one clarification turn;
- total-model-outage fallback to explicit choices;
- stable delivery idempotency keys;
- atomic outbox claim;
- bounded retry;
- required-branch pause on delivery failure;
- real delivery latency and event evidence;
- role knowledge privacy;
- guarded demo reset;
- public-safe logs.

Build the dashboard as an evidence surface showing:
- connected channel status;
- role/channel topology;
- authoritative world facts;
- separate knowledge held by each role;
- inject and decision timeline;
- the red Bay 3 contradiction edge;
- delivery/model latency;
- retries and dedupe counts;
- the final who-knew-what-when report;
- guarded operator start, pause, abort, and demo reset controls.

Work autonomously through PLAN.md and keep TASKS.md truthful. Prioritize:
1. qualification;
2. working two-channel core;
3. canonical contradiction;
4. third channel;
5. restart/idempotency;
6. dashboard;
7. report;
8. polish.

Run format, lint, typecheck, tests, and production builds at every milestone. Create a root bun run check command that runs all non-live quality gates. Add comprehensive tests for the pure engine, contradiction rules, Convex atomicity, Caspian normalization, email quote stripping, duplicate replay, concurrent responses, stale decisions, restart recovery, model fallback, total model outage, channel failure, outbox retry, abort, and demo reset isolation.

Create and maintain:
- docs/DECISIONS.md;
- docs/MANUAL_ACTIONS.md;
- docs/LIVE_TEST_EVIDENCE.md;
- docs/SUBMISSION_CHECKLIST.md;
- docs/ORGANIZER_CONFIRMATIONS.md;
- architecture diagram;
- screenshots;
- Devpost-ready copy.

When an API key, BotFather token, Discord bot action, OAuth/install click, Convex deployment, hosting authorization, or other unavoidable human action is required:
- complete every non-blocked task first;
- document the exact minimal action in docs/MANUAL_ACTIONS.md;
- ask me only for that specific action or secret;
- never invent credentials or expose them;
- resume immediately after it is supplied.

Treat the safe deadline as 12 August 2026 at 2:29 AM Malaysia time unless the organizer confirms the later date. Target submission by 11 August 2026 at 6:00 PM Malaysia time and freeze features by 10 August 2026 at midnight.

Do not claim completion until:
- all P0 and P1 TASKS.md items are complete or a proven external blocker is documented with the strongest honest fallback;
- real Email and Telegram are verified through one handler;
- Discord is verified unless externally blocked;
- real proactive messages reach stored conversations;
- the canonical Asteria scenario runs end to end;
- the Bay 3 contradiction is detected exactly once;
- all three reconciliation messages are real;
- the dashboard shows global truth versus role knowledge;
- the after-action report is complete;
- duplicate, concurrent, stale, restart, model-outage, delivery-failure, and abort paths pass;
- ten consecutive rehearsals succeed;
- bun run check and production builds pass;
- setup works from a fresh clone;
- repository, README, architecture, evidence, screenshots, video, and Devpost copy are finished;
- no secrets, mocked production paths, placeholder claims, or false feature claims remain.

At the end, provide a precise completion report with:
- implemented features;
- exact shared-handler path;
- real channels and evidence;
- test/build results;
- deployment URLs;
- measured demo metrics;
- remaining manual actions;
- known limitations;
- exact final-demo commands and reset procedure.

Continue working until the goal is actually satisfied, except where a specific external credential or human platform action is impossible for you to perform.
```
