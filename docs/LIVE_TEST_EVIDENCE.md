# Live test evidence

Private addresses, connection identifiers, conversation identifiers, and sender data are not stored here. Hashes are truncated SHA-256 values. Full provider evidence remains in the authenticated Caspian project.

## Authenticated channel discovery — PASS

- Date/time: 31 July 2026 MYT
- Endpoint: authenticated `GET /v1/channels`
- Result: 9 live provider rows
- Required targets observed:
  - Email / SES: `initiate`, `media`, `receive`, `reply`, `send`
  - Telegram: `edit_inbound`, `group_visibility`, `interactions`, `media`, `reactions`, `receive`, `reply`, `send`
  - Discord: `group_visibility`, `initiate`, `interactions`, `media`, `reactions`, `receive`, `reply`, `see_bots`, `send`
- Credential values exposed: none

## Installed SDK audit — PASS

- Package: official `caspian-sdk` 0.6.1, exact pin
- Confirmed installed signatures: `connectEmail`, `connectTelegram`, `connectDiscord`, `onMessage`, `sendMessage`, `events`, `dispatchPending`
- Shared-handler source: `apps/agent/src/registerSharedHandler.ts`
- Registration count: exactly one

## Email inbound and reply through shared handler — PASS

- Date/time: 31 July 2026 MYT
- Channel status: active
- Inbound event sequence: 2216
- Inbound event hash: `1a5007af8f36b9e9`
- Inbound message hash: `d08640987f132714`
- Conversation hash: `38f8f427d4be53e2`
- Input: `HELP` through the official Caspian Email test path
- Convex evidence: inbound claimed and processed exactly once; Email conversation captured
- Outbound event sequence: 2217
- Outbound event hash: `2b6518e161733739`
- Outbound message hash: `d9e9a74e0dedacdb`
- Gateway status: sent
- Gateway event latency: 1,878 ms
- Result: PASS

## Email proactive send after process restart — PASS

- Date/time: 31 July 2026 MYT
- Persisted source conversation hash: `7dfd63fbcce8a83e`
- New process loaded the conversation from Convex
- API: `client.sendMessage(conversationId, ...)`
- Outbound event sequence: 2215
- Outbound event hash: `9b7ea1743ac98f9e`
- Outbound message hash: `942dcb5cd73582b9`
- Gateway status: sent
- Result: PASS

## Durable checkpoint and restart — PASS

- Initial baseline: sequence 2212
- Processed inbound: sequence 2213
- Persisted checkpoint after dispatch: 2213
- Restarted process reused the persisted conversation for sequence 2215 proactive send
- Atomic duplicate test: PASS in `tests/integration/convexAtomicity.test.ts`
- Monotonic checkpoint test: PASS

## Telegram inbound, reply, and proactive send — PASS

- Connection status: active
- Inbound sequence: 2219; status: received
- Inbound message hash: `ecd727331a8c23ef`
- Shared-handler reply sequence: 2220; status: sent
- Reply message hash: `7c6e4b246a926bcb`
- Persisted conversation hash for both: `c107b71f65ea5639`
- Proactive send sequence: 2223; status: sent
- Proactive message hash: `7cf821efbeb39c18`
- Proactive conversation hash: `c107b71f65ea5639`
- Convex production evidence: inbound claimed and processed exactly once.

## Discord inbound, reply, and proactive send — PASS

- Connection status: active
- Inbound sequence: 2221; status: received
- Inbound message hash: `34d54ca3f7366e48`
- Shared-handler reply sequence: 2222; status: sent
- Reply message hash: `c8df4db81c5b32cf`
- Persisted conversation hash for both: `7cf9b67003adba3a`
- Proactive send sequence: 2224; status: sent
- Proactive message hash: `04de306c46e9a0a3`
- Proactive conversation hash: `7cf9b67003adba3a`
- Convex production evidence: inbound claimed and processed exactly once.

## Gemini model discovery and deployment configuration — PASS

- Authenticated model listing confirms the API IDs `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` exist.
- `.env.example` uses those exact IDs.
- The Railway worker uses those exact verified IDs.
- No API key or pre-existing value was displayed.

## Public infrastructure — PARTIAL PASS

- Public repository: <https://github.com/Ahm-edAshraf/signal-fracture>
- Public qualification surface: <https://signal-fracture.vercel.app>
- Both returned HTTP 200 on 31 July 2026 MYT.
- Production Convex schema and functions deployed successfully.
- Persistent Railway worker: `https://agent-production-32ad.up.railway.app`
- Railway deployment status: SUCCESS; one running service replica.
- Current worker deployment `0a8a3866-2720-46d7-aae7-a71bac0e84da`: SUCCESS.
- Current web deployment `dpl_DMFGapQWnkGYE63jL8BeWn1o7SXN`: READY and aliased to the public URL.
- `/healthz`: `{"status":"ok"}`
- `/readyz`: `{"status":"ready","channels":["email","telegram","discord"]}`
- The local consumer was stopped before production startup so only one worker dispatches events.
- Public dashboard API returns only aliases, synthetic facts, canonical decisions, delivery metadata, truncated event references, and aggregate reliability values.
- Guarded operator login rejects an incorrect secret with HTTP 401 and issues an HttpOnly, SameSite=Strict cookie after valid authentication.
- The operator secret was rotated through the authenticated Vercel, Railway, and Convex CLIs with terminal echo disabled; the value was not printed, logged, or committed.
- Playwright production checks: 4/4 pass (qualified channels, operator auth boundary, report-export auth boundary, public payload redaction).
- Opt-in live gateway qualification suite: 2/2 pass; the suite performs capability discovery only and sends no participant message.
- Preliminary privacy-reviewed screenshots: `docs/screenshots/dashboard-standby.png` and `docs/screenshots/operator-login.png`.
- Current root gate: 52/52 unit tests and 14/14 Convex integration tests pass, followed by package, worker, and seven-route Next.js production builds.
- Worker recovery regression tests verify that a failed initial checkpoint write retains the original gateway baseline, transient stale-claim and deadline-sweep errors do not terminate the worker, and a successful provider send is not repeated while its idempotent database acknowledgement retries.
- Inbound recovery tests verify that a `claimed` event resumes after a crash window, a processed event produces no repeated consequence across 100 replays, and optional button interactions enter through the same durable claim before the deterministic decision mutation.
- Capability adapter tests verify text retention, supported rich blocks, button removal without `interactions`, media removal without `media`, and best-effort reaction gating. These optional affordances are code-tested but not yet live-smoke-tested.
- Provider-failure worker tests cover Email, Telegram, and Discord with the same bounded retry path; these are simulated failures, not claims that a live provider outage was induced.
- Deterministic deadline tests verify F1 timeout advancement, reset-required later misses, and operator-pause clock freezing.
- Knowledge evidence remains empty after provider acceptance alone and is recorded only after the participant replies; the canonical test then reconstructs Control's stale `OPEN` fact and later confirmed `SEALED` fact separately.
- Branch tests verify safe completion without a contradiction, canonical resolved completion, and explicit failure after a fully answered unsafe reconciliation; every terminal path closes or cancels injects and clears active roles.
- Model-boundary tests record classifier and narrator latency/model selection while exact commands and `ABORT` still bypass Gemini and total outage returns explicit deterministic choices.

## Fresh public clone — PASS

- Source: public `main` branch at commit `d481623`
- Location: isolated temporary directory with all project credentials explicitly unset
- `bun install --frozen-lockfile`: PASS
- `bun run check`: PASS
- Result at that commit: 52 unit tests, 14 integration tests, package/worker build, and all seven rendered Next.js routes built successfully.
