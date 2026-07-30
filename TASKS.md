# TASKS.md — Execution Checklist

Update truthfully. Do not check an item without evidence.

## P0 qualification

- [x] repository initialized during event window
- [x] strict TypeScript and Bun workspaces
- [x] `.env.example`
- [x] secrets ignored
- [x] live Caspian guide inspected
- [x] authenticated `/v1/channels` recorded
- [x] installed SDK signatures inspected
- [x] Email connected
- [x] Telegram connected
- [x] exactly one `client.onMessage` registration
- [x] real Email inbound
- [x] real Email reply
- [ ] real Telegram inbound
- [ ] real Telegram reply
- [x] stored conversation IDs
- [x] proactive Email send
- [ ] proactive Telegram send
- [x] real event IDs recorded
- [x] inbound dedup
- [x] persistent worker selected
- [x] durable checkpoint loop
- [x] restart state test

## P0 core domain

- [x] pure domain package
- [x] session state machine
- [x] inject state machine
- [x] world fact model
- [x] role knowledge model
- [x] Asteria scenario definition
- [x] deterministic transition rules
- [x] deterministic contradiction rules
- [x] canonical contradiction test
- [x] resolution test
- [x] deterministic metrics

## P0 participant workflow

- [x] signed/expiring role codes
- [x] `JOIN`
- [x] `HELP`
- [x] `STATUS`
- [x] `ABORT`
- [x] role endpoint binding
- [x] unauthorized role response rejected
- [x] email quote stripping
- [x] exact command parser
- [x] stale answer handling
- [x] clarification flow

## P0 Gemini

- [x] exact primary API model ID verified
- [x] exact fallback ID verified
- [ ] IDs in environment
- [x] strict Zod output
- [x] active choices constrained
- [x] confidence threshold
- [x] one clarification
- [x] primary fallback
- [x] total outage fallback
- [x] commands bypass LLM
- [x] transitions bypass LLM
- [ ] report narrative uses deterministic metrics

## P0 delivery

- [x] Convex outbox
- [x] stable idempotency keys
- [x] atomic claim
- [x] bounded retry
- [x] permanent failure
- [x] branch pause on required failure
- [x] delivery latency
- [x] no duplicate consequence
- [x] no false delivered state

## P0 dashboard

- [ ] role/channel topology
- [ ] global world facts
- [ ] role knowledge panels
- [ ] inject timeline
- [ ] decision timeline
- [ ] contradiction graph
- [ ] red Bay 3 conflict
- [ ] delivery status
- [ ] retry/dedupe metrics
- [x] who-knew-what-when report
- [x] guarded demo reset

## P1 third channel and enhancements

- [x] Discord connected
- [ ] real Discord inbound
- [ ] real Discord reply
- [ ] proactive Discord send
- [ ] three-channel canonical demo
- [x] text fallback everywhere
- [ ] capability-aware rich blocks
- [ ] optional button test
- [ ] optional reaction test
- [ ] optional media test

## Reliability

- [x] duplicate inbound replay
- [x] duplicate outbound suppression
- [x] concurrent response test
- [x] process crash/restart
- [x] checkpoint replay
- [x] stale response
- [x] expired join code
- [x] invalid role
- [x] primary model failure
- [x] total model outage
- [ ] Email delivery failure
- [ ] Telegram delivery failure
- [ ] Discord delivery failure
- [x] abort during active session
- [x] session reset isolation
- [x] rate limiting
- [x] public log redaction

## Release

- [ ] deployed Convex
- [ ] deployed web
- [ ] deployed persistent worker
- [x] health endpoint
- [x] readiness endpoint
- [x] root `bun run check`
- [x] unit tests pass
- [x] integration tests pass
- [x] production builds pass
- [ ] live tests recorded
- [ ] ten rehearsals
- [ ] fresh clone setup
- [ ] secret scan
- [ ] README complete
- [x] architecture diagram
- [ ] screenshots
- [ ] video take 1
- [ ] video backup
- [ ] Devpost copy
- [ ] repository public
- [ ] links tested incognito
- [ ] submitted before internal deadline

## P2 — only after every item above

- [ ] second scenario
- [ ] scenario editor
- [ ] fourth role
- [ ] richer animation
- [ ] PDF export
- [ ] role-specific media
- [ ] compliance mapping
