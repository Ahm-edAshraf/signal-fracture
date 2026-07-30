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

## Telegram — CONNECTION PASS / MESSAGE TEST PENDING

- Connection status returned by installed SDK: active
- Real inbound: pending participant `HELP`
- Real reply: pending
- Proactive send: pending persisted inbound conversation
- No claim of message-path success is made yet.

## Discord — CONNECTION PASS / MESSAGE TEST PENDING

- Connection status returned by installed SDK: active
- Real inbound: pending participant `HELP`
- Real reply: pending
- Proactive send: pending persisted inbound conversation
- No claim of message-path success is made yet.

## Gemini model discovery — PASS WITH CONFIG FOLLOW-UP

- Authenticated model listing confirms the API IDs `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` exist.
- `.env.example` uses those exact IDs.
- The pre-existing shell values did not match an available ID and must be replaced in the eventual worker deployment configuration.
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
