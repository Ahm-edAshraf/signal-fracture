# CASPIAN_COMPLIANCE.md

## Qualification matrix

| Requirement         | Implementation                      | Evidence required                               |
| ------------------- | ----------------------------------- | ----------------------------------------------- |
| Official SDK        | `caspian-sdk` TypeScript package    | package lock + source imports                   |
| Two channels        | Email + Telegram minimum            | real inbound/outbound screenshots and event IDs |
| Target channels     | Email + Telegram + Discord          | live test log                                   |
| One handler         | one `client.onMessage` registration | direct source link                              |
| Same business logic | channel-neutral dispatcher          | architecture + code                             |
| Real operation      | no mocked judged path               | video + evidence                                |
| Public repository   | GitHub public                       | incognito verification                          |
| Demo video          | under official limit                | public video URL                                |
| Live readiness      | persistent deployment               | health URL + rehearsal log                      |

## Exact SDK surface used

Source snapshot 0.6.1 confirms:

```ts
client.onMessage(handler)
message.reply(text?, html?, blocks?, media?)
client.sendMessage(conversationId, text?, html?, blocks?, media?)
client.dispatchPending(afterSeq)
client.channels()
client.events(...)
client.connectEmail(...)
client.connectTelegram(...)
client.connectDiscord(...)
```

## One-handler proof

Required source structure:

```ts
client.onMessage(async (message) => {
  await handleInboundMessage(normalize(message), dependencies);
});
```

Forbidden:

```ts
if (message.channel === "telegram") {
  await handleTelegramBusinessFlow(message);
}
if (message.channel === "email") {
  await handleEmailBusinessFlow(message);
}
```

Allowed:

- channel-specific formatting;
- quote stripping for email;
- capability-aware blocks;
- maximum-length handling.

Business semantics must remain shared.

## Incoming and outgoing proof

For each target channel record:

- connection ID, redacted;
- inbound Caspian message ID;
- conversation ID hash;
- inbound timestamp;
- outbound provider/Caspian ID;
- arrival screenshot;
- latency;
- result.

## Hosted-gateway verification

Before relying on a feature:

1. call authenticated `client.channels()` or `/v1/channels`;
2. inspect capabilities;
3. run a real test;
4. record evidence;
5. add fallback.

Core requirements use only:

- receive;
- reply;
- send to existing conversation;
- text.

Optional:

- blocks;
- interactions;
- reactions;
- media.

## Channel policy

### Email

Use:

- role join;
- structured director injects;
- same-thread decisions.

Must test:

- deliverability;
- quote stripping;
- proactive send;
- subject/thread behavior.

### Telegram

Use:

- fast field decisions;
- proactive injects;
- text commands.

Optional:

- buttons;
- reaction.

### Discord

Use:

- mission-control decisions;
- proactive injects;
- text commands.

Must test:

- bot token;
- required intents;
- DM/channel behavior;
- proactive send.

## Listener policy

Production judged deployment uses a persistent worker and durable checkpoint loop.

Do not:

- rely on a serverless SDK webhook handler that is not published;
- run multiple workers;
- assume SDK memory dedup is durable;
- assume `listen()`'s default latest cursor recovers missed events.

## Organizer questions

Ask in Discord/official channel:

1. Which deadline is authoritative?
2. Are optional `onInteraction` and `onReaction` handlers acceptable when all qualifying behavior uses one `onMessage` handler?
3. Are fictional drill scenarios explicitly acceptable?
4. Is the three-minute video limit still current?

Store answers in `docs/ORGANIZER_CONFIRMATIONS.md`.
