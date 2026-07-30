# ARCHITECTURE.md — Signal Fracture

## Objective

Prove that one Caspian agent can maintain a causal fictional world across private participants on different real channels.

## Repository layout

```text
signal-fracture/
├─ apps/
│  ├─ agent/
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ durableEventLoop.ts
│  │     ├─ handleInboundMessage.ts
│  │     ├─ commandRouter.ts
│  │     ├─ presenter.ts
│  │     ├─ emailQuoteStripper.ts
│  │     └─ health.ts
│  └─ web/
│     ├─ app/
│     ├─ components/
│     └─ lib/
├─ packages/
│  ├─ core/
│  │  └─ src/
│  │     ├─ domain.ts
│  │     ├─ scenarioEngine.ts
│  │     ├─ contradictionEngine.ts
│  │     ├─ decisionParser.ts
│  │     ├─ stateMachine.ts
│  │     ├─ metrics.ts
│  │     └─ scenarios/asteria.ts
│  ├─ ai/
│  │  └─ src/
│  │     ├─ gemini.ts
│  │     ├─ schema.ts
│  │     └─ prompts.ts
│  ├─ caspian/
│  │  └─ src/
│  │     ├─ client.ts
│  │     ├─ normalize.ts
│  │     ├─ capabilities.ts
│  │     └─ send.ts
│  └─ shared/
├─ convex/
│  ├─ schema.ts
│  ├─ sessions.ts
│  ├─ roles.ts
│  ├─ inbound.ts
│  ├─ decisions.ts
│  ├─ engine.ts
│  ├─ contradictions.ts
│  ├─ outbox.ts
│  ├─ checkpoint.ts
│  ├─ audit.ts
│  └─ reports.ts
└─ tests/
```

## Components

### Persistent agent worker

Responsibilities:

- create Caspian client;
- connect configured channels;
- register one message handler;
- poll events from durable checkpoint;
- normalize inbound messages;
- execute command/decision workflow;
- drain Convex outbox;
- expose health/readiness.

### Convex

System of record:

- session state;
- role endpoints;
- facts and knowledge;
- injects;
- decisions;
- contradictions;
- deduplication;
- checkpoint;
- outbox;
- audit;
- report metrics.

### Core package

Pure deterministic logic:

- scenario definition;
- transition evaluation;
- contradiction rules;
- state machine;
- metrics.

No network, Caspian, Convex, Gemini, or React imports.

### AI package

Narrow adapter:

- allowed-decision classification;
- clarification;
- report prose;
- strict Zod validation.

### Web dashboard

Reactive evidence surface:

- global truth;
- role knowledge;
- causal graph;
- timeline;
- channel status;
- metrics;
- operator controls.

## One-handler design

```ts
const client = new CommClient();

await connectConfiguredChannels(client);

client.onMessage(async (message) => {
  await handleInboundMessage(normalizeCaspianMessage(message), dependencies);
});
```

No channel-specific business handlers.

Optional `onInteraction` and `onReaction` handlers may translate events into the same internal command dispatcher. They are not required for the judged path.

## Durable event loop

The SDK's `listen()` starts from the latest sequence by default and keeps its cursor in memory. For restart-safe demo behavior, use a durable wrapper around `dispatchPending`.

```ts
async function runDurableEventLoop(
  client: CommClient,
  checkpointStore: CheckpointStore,
  signal: AbortSignal,
) {
  let seq = await checkpointStore.load("caspian");

  while (!signal.aborted) {
    try {
      const nextSeq = await client.dispatchPending(seq);
      if (nextSeq !== seq) {
        await checkpointStore.save("caspian", nextSeq);
        seq = nextSeq;
      }
      await sleep(750, signal);
    } catch (error) {
      await recordPollFailure(error);
      await sleepWithBoundedBackoff(signal);
    }
  }
}
```

Crash window:

- If a crash occurs after dispatch but before checkpoint persistence, events replay.
- Convex event-id idempotency prevents duplicate effects.

Use one worker instance.

## Inbound flow

```text
Caspian event
-> one handler
-> normalize
-> strip email quotes
-> atomic inbound dedup
-> resolve role endpoint
-> deterministic command parser
-> active-inject lookup
-> deterministic choice parser
-> Gemini only if unresolved
-> atomic decision acceptance
-> pure scenario transition
-> contradiction evaluation
-> create outbox effects
-> immediate acknowledgement
```

## Outbound flow

```text
Convex outbox pending item
-> atomic claim
-> capability-aware presenter
-> client.sendMessage(conversationId, text, html?, blocks?, media?)
-> record provider response and latency
-> mark delivered/sent
-> retry or permanent failure
```

Use stable logical keys such as:

```text
inject:<injectId>:role:<roleId>
contradiction:<id>:role:<roleId>
session:<id>:completed:role:<roleId>
```

## Caspian addressing

Participant endpoint:

```ts
type RoleEndpoint = {
  roleId: Id<"roles">;
  channel: string;
  conversationId: string;
  connectionId: string;
  senderFingerprint: string;
  joinedAt: number;
  active: boolean;
};
```

Immediate replies use `message.reply`.

Scheduled/causal injects use `client.sendMessage(conversationId, ...)`.

Do not use cold `initiate()` for the canonical demo. Every participant messages the agent first.

## Channel connections

Verified source signatures:

```ts
await client.connectEmail({ username: "signal-fracture" });
await client.connectTelegram({ botToken: env.TELEGRAM_BOT_TOKEN });
await client.connectDiscord({ botToken: env.DISCORD_BOT_TOKEN });
```

Use live package types at implementation time.

## Decision parsing

Order:

1. exact command/alias;
2. normalized deterministic phrase table;
3. Gemini structured classification constrained to active choices;
4. clarification.

Gemini schema:

```ts
const DecisionClassification = z.object({
  decision: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  clarificationNeeded: z.boolean(),
  rationaleSummary: z.string().max(240).nullable(),
  safety: z.object({
    exerciseOnly: z.boolean(),
    rejectReason: z.string().nullable(),
  }),
});
```

Never send unrestricted allowed values. Supply the exact active choice enum.

## Concurrency

- Caspian processing is per-event.
- Convex mutations are atomic.
- Decision acceptance checks expected inject/session version.
- Duplicate final decisions no-op.
- Outbox claim is compare-and-set.
- Only one worker in judged deployment.

## Deployment

- Agent: Railway/Fly.io/Render persistent worker
- Web: Vercel
- Data: Convex
- GitHub: public repository

No Lambda/Vercel function for the listener.

## Observability

Structured fields:

```text
eventId
messageId
conversationHash
sessionId
roleId
injectId
decisionId
contradictionId
channel
model
latencyMs
attempt
status
errorCode
```

Public dashboard uses aliases and redacted data.

## Health

Agent endpoints:

- `/healthz`: process running
- `/readyz`: Convex reachable, Caspian key configured, minimum channels connected or connection IDs known

Do not leak configuration values.
