# PLAN.md — Solo Execution Plan

## Deadline assumptions

Use the safer deadline:

- Hard: 12 August 2026, 2:29 AM MYT
- Internal submit: 11 August 2026, 6:00 PM MYT
- Feature freeze: 10 August 2026, 12:00 AM MYT

## Priority

1. Qualification
2. Real two-channel state
3. Canonical contradiction
4. Third channel
5. Restart/idempotency
6. Dashboard
7. After-action report
8. Polish

## Gate A — Caspian qualification

Do not proceed to full UI until:

- Email inbound/reply works.
- Telegram inbound/reply works.
- One handler handles both.
- `conversationId` persists.
- Proactive `sendMessage` works.
- Duplicate message replay is harmless.
- State survives restart.

## Gate B — product core

Must pass before visual polish:

- Three roles join.
- Fixed Asteria scenario starts.
- Role-specific injects arrive.
- Field and Control decisions create contradiction.
- Reconciliation injects arrive.
- Session resolves.
- Timeline is durable.

## Gate C — submission

- Discord works or documented external blocker.
- Ten rehearsals.
- Failure paths tested.
- Public README and evidence.
- Video recorded.
- Fresh clone works.
- No secrets.

## 31 July — qualification spike

- Initialize repository and Bun workspace.
- Install `caspian-sdk@0.6.1`, Zod, Convex.
- Inspect live guide and package types.
- Query authenticated `/v1/channels`.
- Connect named Email inbox.
- Connect Telegram.
- Register one handler.
- Verify real inbound/reply on both.
- Persist endpoint and message ID.
- Verify proactive send.
- Build durable checkpoint proof.
- Document all results.

Deliverable: `docs/LIVE_TEST_EVIDENCE.md` with PASS/FAIL.

## 1 August — Discord and durable onboarding

- Connect Discord.
- Add role join codes.
- Implement `JOIN`, `HELP`, `STATUS`, `ABORT`.
- Add email quote stripping.
- Add Convex schema.
- Add atomic inbound dedup.
- Add checkpoint loop.
- Test restart.

Deliverable: three real role endpoints.

## 2 August — pure scenario engine

- Implement domain types.
- Encode Asteria initial facts.
- Encode per-role knowledge.
- Implement inject prerequisites.
- Implement allowed decision sets.
- Implement deterministic consequences.
- Implement session/inject state machines.
- Unit tests.

Deliverable: pure fixture completes without network.

## 3 August — decision parsing

- Exact commands/aliases.
- Phrase normalization.
- Gemini structured classification.
- Primary/fallback env models.
- Clarification.
- exercise-only safety rejection.
- Latency/quota tests.

Deliverable: canonical real wording parses reliably.

## 4 August — outbox and causal messaging

- Stable delivery IDs.
- Atomic claim.
- Proactive send worker.
- Bounded retry.
- Permanent failure.
- Branch pause on required failure.
- Delivery audit and latency.

Deliverable: injects send once after restart/replay.

## 5 August — contradiction engine

- Implement five contradiction types.
- Implement canonical Bay 3 rule.
- Generate reconciliation injects.
- Implement resolution.
- Metrics.

Deliverable: complete canonical flow via automated integration test.

## 6 August — dashboard

- Channel health.
- Role map.
- Global facts.
- Role knowledge.
- Inject/decision timeline.
- Red contradiction edge.
- Operator start/pause/abort/reset.
- Recording layout.

Deliverable: judge understands conflict in 20 seconds.

## 7 August — report

- who-knew-what-when timeline;
- deterministic metrics;
- report page;
- optional Gemini narrative;
- Markdown export;
- screenshot layout.

## 8 August — reliability

Test and fix:

- duplicate inbound;
- duplicate outbound;
- concurrent decisions;
- stale reply;
- primary model failure;
- total model outage;
- channel failure;
- restart;
- email quoted reply;
- expired code;
- abort.

## 9 August — deployment

- Convex production/demo deployment.
- Vercel dashboard.
- Persistent agent worker.
- Health/readiness.
- External accounts/devices.
- Secret scan.

## 10 August — freeze and rehearsals

- Run exact demo ten times.
- Record metrics.
- Fix only defects and comprehension.
- Remove experimental code.
- `bun run check`.
- Freeze at midnight.

## 11 August — submission

- Record two clean video takes.
- Final README.
- Architecture diagram.
- Screenshots.
- Fresh clone.
- Public repository.
- Incognito link test.
- Submit by 6 PM MYT.

## Safe fallback

If Discord blocks:

- three participants;
- Field and Director in separate Email/Telegram conversations;
- Control on the other channel;
- Email + Telegram only;
- same contradiction and shared handler.

## Drop order

1. scenario editor
2. multiple scenarios
3. interactions/buttons
4. reactions
5. media
6. PDF export
7. fourth role
8. animations
9. user accounts
10. voice/SMS
