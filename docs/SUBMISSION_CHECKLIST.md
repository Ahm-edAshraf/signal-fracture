# Submission checklist

This file is intentionally conservative. An item is checked only after public or live evidence exists.

## Qualification

- [x] Official SDK pinned and imported
- [x] Exactly one shared `onMessage` registration
- [x] Real Email inbound and reply
- [x] Proactive Email send to a persisted conversation after restart
- [ ] Real Telegram inbound, reply, and proactive send
- [ ] Real Discord inbound, reply, and proactive send

## Product

- [x] Pure deterministic canonical scenario passes
- [x] Atomic Convex canonical scenario passes
- [x] One Bay 3 contradiction is created and resolved exactly once in integration tests
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
- [ ] Induced process crash during a live scenario
- [ ] Ten consecutive live rehearsals

## Release

- [ ] `bun run check` passes from a clean tree
- [ ] Fresh-clone setup verified
- [ ] Production Convex deployment
- [ ] Persistent worker deployed with one replica
- [ ] Dashboard deployed
- [ ] Repository public and checked incognito
- [ ] Screenshots captured and privacy-reviewed
- [ ] Primary and backup videos recorded
- [ ] Devpost copy finalized
- [ ] Submission completed
