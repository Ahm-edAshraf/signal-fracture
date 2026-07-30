# Live test evidence

Private addresses, connection identifiers, conversation identifiers, and sender data are not stored here. Hashes are truncated SHA-256 values. Full provider evidence remains in the authenticated Caspian project.

## Authenticated channel discovery — PASS

- Date/time: 31 July 2026 MYT
- Endpoint: authenticated `GET /v1/channels`
- Result: 9 live provider rows
- Required targets observed:
  - Email / SES: receive, reply, send
  - Telegram: receive, reply, send
  - Discord: receive, reply, send
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
- `/healthz`: `{"status":"ok"}`
- `/readyz`: `{"status":"ready","channels":["email","telegram","discord"]}`
- The local consumer was stopped before production startup so only one worker dispatches events.
- Public dashboard API returns only aliases, synthetic facts, canonical decisions, delivery metadata, truncated event references, and aggregate reliability values.
- Guarded operator login rejects an incorrect secret with HTTP 401 and issues an HttpOnly, SameSite=Strict cookie after valid authentication.
- Playwright production checks: 3/3 pass (qualified channels, operator auth boundary, public payload redaction).
- Preliminary privacy-reviewed screenshots: `docs/screenshots/dashboard-standby.png` and `docs/screenshots/operator-login.png`.
