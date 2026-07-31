# Submission checklist

This file is intentionally conservative. An item is checked only after public or live evidence exists.

## Qualification

- [x] Official SDK pinned and imported
- [x] Exactly one shared `onMessage` registration
- [x] Real Email inbound and reply
- [x] Proactive Email send to a persisted conversation after restart
- [x] Real Telegram inbound, reply, and proactive send
- [x] Real Discord inbound, reply, and proactive send

## Product

- [x] Pure deterministic canonical scenario passes
- [x] Atomic Convex canonical scenario passes
- [x] One Bay 3 contradiction is created and resolved exactly once in integration tests
- [x] Guarded operator start, pause, resume, abort, and reset controls
- [x] Deterministic deadlines, timeout behavior, and coordination scoring
- [x] Authenticated completed-report export
- [ ] Canonical three-channel live scenario completed
- [ ] Dashboard reviewed against a live session
- [ ] Who-knew-what-when report exported from a live session

## Reliability

- [x] Inbound deduplication
- [x] Monotonic durable checkpoint
- [x] Atomic outbox claim
- [x] Bounded retry and permanent failure pause
- [x] Exact-command model bypass
- [x] Gemini primary/fallback/total-outage contracts
- [x] Claimed inbound recovery and 100 duplicate replay regression
- [x] Capability-gated optional interaction path enters through atomic deduplication
- [ ] Induced process crash during a live scenario
- [ ] Ten consecutive live rehearsals

## Release

- [x] `bun run check` passes from a clean tree
- [x] Fresh-clone setup verified
- [x] Production Convex deployment
- [x] Persistent worker deployed with one replica
- [x] Live evidence dashboard and guarded operator console deployed
- [x] Repository and public deployment checked without authentication
- [ ] Screenshots captured and privacy-reviewed
- [ ] Primary and backup videos recorded
- [ ] Devpost copy finalized
- [ ] Submission completed
