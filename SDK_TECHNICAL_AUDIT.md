# Caspian SDK 0.6.1 — Technical Audit for Signal Fracture

**Audited input:** user-uploaded `caspian-sdk-main.zip`  
**Audit date:** 31 July 2026  
**App target:** TypeScript/Bun  
**Audited source snapshot:** appears to correspond to official commit `f985ad0f7933321ed82c5d13f0222f6d81bfe228` from 30 July 2026.

This audit separates:

- **Implemented in source**
- **Documented**
- **Must be live verified**

---

# 1. Release maturity

The TypeScript and Python package metadata identify version **0.6.1**.

The repository is moving rapidly. Recent changes include:

- malformed-event listener crash fix;
- atomic outbox claims;
- interactions and reactions;
- media;
- rich blocks;
- Telegram card-image behavior;
- Slack socket mode;
- Bluesky;
- MMS.

Conclusion:

> Pin the exact dependency version and avoid treating advanced features as stable until live-tested.

Recommended:

```json
{
  "dependencies": {
    "caspian-sdk": "0.6.1"
  }
}
```

Do not use a floating caret until the submission is frozen.

---

# 2. TypeScript inbound message contract

`Message` exposes:

```ts
id: string
conversationId: string
connectionId: string
customerId: string
agentId: string
channel: string
sender: Record<string, unknown> | null
subject: string | null
text: string | null
html: string | null
media: Media[]
```

Methods:

```ts
message.reply(text?, html?, blocks?, media?)
message.react(emoji)
message.typing()
```

Implications:

- Use `message.id` as the primary inbound idempotency key.
- Use `conversationId` as the endpoint for future messages in that thread.
- Treat `sender` as provider-dependent untrusted metadata.
- Do not assume text is present.
- Do not assume channel identities are globally unified.
- Link a participant role explicitly in the application.

Source:

- https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/sdks/typescript/src/client.ts

---

# 3. Handler contract

```ts
client.onMessage(handler);
client.onInteraction(handler);
client.onReaction(handler);
```

`onMessage` accepts async TypeScript handlers and awaits them.

The listener catches handler exceptions and continues.

Qualification recommendation:

- Register exactly one `onMessage`.
- Route every text action through that handler.
- Do not require `onInteraction` or `onReaction` for the judged loop.
- Optional interaction/reaction handlers should call the same domain dispatcher.

---

# 4. Outbound contract

## Reply

```ts
client.reply(messageId, text?, html?, blocks?, media?)
message.reply(...)
```

Reply preserves the source thread.

The gateway refuses to reply when:

- the target is not inbound;
- no provider message ID exists;
- the target is auto-generated;
- the conversation reaches the 24-hour loop-prevention cap.

## Existing conversation send

```ts
client.sendMessage(conversationId, text?, html?, blocks?, media?)
```

This is the core proactive API for Signal Fracture.

## Cold initiate

```ts
client.initiate(connectionId, recipient, text);
```

Do not use it for the core:

- Telegram bot capability excludes cold initiate.
- A public live user reported that `initiate()` did not return a conversation ID.
- Cold initiation adds identity and delivery complexity.

Require every participant to send `JOIN` first.

---

# 5. Provider capability matrix from source

| Provider                    | Logical channel | Key credentials                     | Core capabilities                                                                          |
| --------------------------- | --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| SES                         | Email           | hosted/configured by gateway        | receive, reply, send, initiate, media                                                      |
| Telegram bot                | Telegram        | `bot_token`                         | receive, reply, send, group visibility, edit inbound, interactions, reactions, media       |
| Discord                     | Discord         | bot token or webhook mode           | receive, reply, send, initiate, group visibility, see bots, interactions, reactions, media |
| Slack                       | Slack           | OAuth or BYO app/socket credentials | receive, reply, send, interactions, reactions, media                                       |
| Bluesky                     | Bluesky         | identifier + app password           | receive, reply, send                                                                       |
| X                           | X               | OAuth/provider credentials          | receive, reply, send                                                                       |
| Twilio/Telnyx               | Phone/SMS       | provider credentials                | receive, reply, send, initiate; media varies                                               |
| WhatsApp/RCS/iMessage/voice | respective      | provider or hosted setup            | source exists; hosted availability must be queried                                         |

Use only Email, Telegram, and Discord in the judged core.

---

# 6. Rich blocks

Source types include:

- heading
- text
- divider
- image
- fields
- list
- buttons
- card

The SDK documentation says Slack, Discord, Telegram, and Email render blocks and other channels degrade to text.

Risk:

- live guide prose has been inconsistent with source;
- blocks were added recently;
- provider rendering may differ.

Policy:

- every block payload includes a complete text fallback;
- no state transition depends on a button;
- use text commands for the canonical demo;
- enable buttons only after real Telegram and Discord interaction tests.

---

# 7. Interactions and reactions

Source implements:

- `interaction.received`
- `reaction.received`
- `Interaction.reply()`
- `Reaction.reply()`
- `message.react()`

Telegram, Discord, and Slack source capabilities include interactions/reactions.

Policy:

- optional only;
- store interaction idempotency;
- verify sender/role before applying;
- map button values to the same deterministic action schema;
- never permit a reaction to bypass role membership or stale-inject checks.

---

# 8. Attachments and media

Inbound `Message.media` and outbound media are implemented.

Potential demo enhancement:

- Field Engineer receives a fictional pressure-gauge image.

Risks:

- URL accessibility;
- provider size limits;
- MIME handling;
- attachment delay;
- source/host drift.

Policy:

- demo remains understandable without the image;
- text includes all required information;
- test one small PNG only;
- do not use participant-uploaded files in the judged core.

---

# 9. Conversation and history

APIs:

```ts
client.listConversations(connectionId?)
client.listMessages(conversationId)
client.backfill(conversationId, limit)
```

Provider conversation identity is based on:

```text
(connection_id, provider_thread_id)
```

Implications:

- A Caspian conversation is a provider thread, not a universal human identity.
- Signal Fracture must explicitly bind a role code to a conversation.
- One person using two channels creates two endpoints unless linked by the app.
- Do not claim automatic cross-channel identity merging.

---

# 10. Listener behavior

`client.listen()`:

- polls the event stream;
- defaults to one-second polling;
- retries poll failures with exponential backoff;
- catches handler errors;
- uses per-conversation scheduling;
- supports:
  - queue
  - debounce
  - drop
  - parallel
- starts at latest sequence unless `fromSeq` is provided;
- runs indefinitely until aborted.

Recommended:

```ts
await client.listen({
  concurrency: "queue",
  pollInterval: 1,
  maxBackoff: 30,
  signal: abortController.signal,
});
```

Do not use `parallel` for scenario decisions.

---

# 11. Cursor and restart limitation

The listener updates event sequence internally but does not expose a durable checkpoint hook.

Open issue #83 confirms that the SDK lacks a cross-invocation state/dedup adapter.

Open issue #82 confirms that serverless webhook-dispatch mode is not yet implemented.

Therefore:

- use one persistent process;
- use Convex for application idempotency;
- add event reconciliation;
- do not run multiple listeners without a distributed ownership lock.

Recommended reconciliation:

```text
saved event seq
      |
      v
client.events(afterSeq)
      |
      v
for each message.received:
  check message.id in Convex
  process if unseen
      |
      v
persist newest seq
```

Keep the normal SDK handler path for live messages. Reconciliation should call the same application dispatcher after normalizing the event payload.

---

# 12. Gateway durability

The uploaded gateway source contains:

- a provider-event dedup table;
- unique provider/external-event constraint;
- durable outbox jobs;
- atomic job claims;
- retry up to five attempts;
- `message.sent` events;
- signed developer webhooks;
- SSRF checks.

This improves transport reliability.

It does not remove the need for application idempotency because:

- a state transition may be retried after a process crash;
- multiple app instances may race;
- the SDK’s cross-invocation state layer is not implemented;
- the app has its own causal effects and timers.

---

# 13. Rate and loop controls found in source

## Sandbox-project minting

- five requests per hour per client IP.

## Reply cap

- 25 outbound replies per conversation per 24 hours.

The exact hosted configuration may differ, but the demo should remain far below the cap.

Use five to eight messages per participant at most.

---

# 14. Free versus paid channels

The official README states:

Free:

- Email
- Telegram
- Slack
- Discord
- Bluesky

Paid/prepaid:

- channels such as X, WhatsApp, iMessage and other usage-based transports, depending on live gateway availability.

Signal Fracture should not depend on paid channels.

---

# 15. Authentication and credentials

## Caspian

```text
CASPIAN_API_KEY
CASPIAN_BASE_URL
```

## Telegram

```text
TELEGRAM_BOT_TOKEN
```

## Discord

```text
DISCORD_BOT_TOKEN
```

Discord may require message-content intent or installation configuration according to the current live guide.

## Email

Use a readable named inbox when available.

Never commit credentials. Validate environment at startup.

---

# 16. Recommended application interfaces

```ts
interface CommunicationPort {
  replyToInbound(input: ReplyInput): Promise<DeliveryResult>;
  sendToConversation(input: SendInput): Promise<DeliveryResult>;
}

interface StatePort {
  claimInbound(messageId: string): Promise<"new" | "duplicate">;
  bindRole(input: RoleBinding): Promise<void>;
  applyDecision(input: DecisionInput): Promise<TransitionResult>;
  enqueueDeliveries(deliveries: PlannedDelivery[]): Promise<void>;
}

interface DecisionParser {
  parse(input: DecisionParseInput): Promise<ParsedDecision>;
}

interface ScenarioEngine {
  transition(snapshot: ScenarioSnapshot, action: DomainAction): TransitionPlan;
}
```

Keep Caspian-specific objects out of the scenario engine.

---

# 17. Minimum source-backed smoke test

```ts
import { CommClient } from "caspian-sdk";

const client = new CommClient();

await client.connectEmail({ username: "signal-fracture" });
await client.connectTelegram({ botToken: process.env.TELEGRAM_BOT_TOKEN! });

client.onMessage(async (message) => {
  console.log({
    id: message.id,
    conversationId: message.conversationId,
    channel: message.channel,
  });

  await message.reply(
    `EXERCISE TEST — received through the shared handler on ${message.channel}.`,
  );
});

await client.listen({ concurrency: "queue" });
```

After one inbound message from each channel, use the captured conversation IDs:

```ts
await client.sendMessage(
  conversationId,
  "EXERCISE TEST — proactive delivery to the existing conversation.",
);
```

Do not move forward until this passes reliably.

---

# 18. Must-live-verify checklist

- [ ] authenticated `/v1/channels`
- [ ] exact installed package version
- [ ] Email connect
- [ ] Email inbound
- [ ] Email reply
- [ ] Telegram connect
- [ ] Telegram inbound
- [ ] Telegram reply
- [ ] Discord connect
- [ ] Discord inbound
- [ ] Discord reply
- [ ] proactive `sendMessage` to each
- [ ] message IDs stable
- [ ] conversation IDs stable
- [ ] event API
- [ ] restart reconciliation
- [ ] email quote stripping
- [ ] Telegram block
- [ ] Discord block
- [ ] button interaction
- [ ] small image
- [ ] reply cap behavior
- [ ] no duplicate side effects

---

# 19. Final SDK verdict

The SDK supports the interaction required by Signal Fracture.

The safest implementation is:

- one TypeScript `onMessage` handler;
- Email, Telegram, and Discord;
- text commands as the canonical action path;
- stored conversation IDs;
- proactive `sendMessage`;
- Convex durability;
- one persistent worker;
- app-level idempotency and reconciliation;
- optional buttons/media after live verification.

The SDK is capable enough, but not mature enough to justify building around undocumented behavior or deploying the listener as stateless serverless code.
