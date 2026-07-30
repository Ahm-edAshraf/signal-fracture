# TESTING.md — Signal Fracture

## Rule

Automated tests may use fakes. Qualification, evidence, video, and finalist demos must use real Caspian channels.

## 1. Pure unit tests

### State machine

- valid session transitions;
- invalid regression;
- abort from active states;
- final states immutable;
- inject opens once;
- stale inject cannot accept decision.

### Scenario engine

- initial facts correct;
- Field seal changes global fact;
- Control retains stale knowledge;
- Control route creates expected consequence;
- Director decision recorded;
- reconciliation changes route/escalation;
- completion rule exact.

### Contradiction engine

- Bay 3 sealed + route Bay 3 => one conflict;
- route Bay 5 => no conflict;
- repeated evaluation => no duplicate;
- stale knowledge source recorded;
- missing escalation rule;
- resolution recorded once.

### Commands

- case/whitespace tolerance;
- aliases;
- wrong role;
- invalid option;
- quoted email removed;
- `ABORT` always works;
- `STATUS` shows role-known facts only.

### Metrics

- divergence duration;
- detection latency;
- reconciliation time;
- channel latency;
- duplicate count.

## 2. AI contract tests

- canonical Field natural language;
- canonical Control natural language;
- canonical Director natural language;
- ambiguous two-choice response;
- unrelated answer;
- unsafe real-emergency request;
- malformed JSON;
- primary failure;
- fallback success;
- total outage;
- exact command triggers zero model calls.

Assert schemas and canonical choice, not prose.

## 3. Convex integration tests

- join code single use;
- endpoint upsert;
- event ID unique;
- decision atomic acceptance;
- expected version check;
- transition + fact + audit atomicity;
- contradiction unique;
- outbox idempotency;
- delivery claim;
- checkpoint monotonic;
- demo reset isolation;
- report metrics.

## 4. Caspian adapter tests

Use sanitized payload fixtures from the audited SDK.

- Email normalization;
- Telegram normalization;
- Discord normalization;
- missing sender;
- media present;
- conversation ID;
- message ID;
- text presenter;
- rich-block capability gate;
- proactive send request shape;
- retryable error classification;
- paid/account error display;
- quote stripping.

## 5. Local end-to-end test

Using fakes:

1. three JOIN messages;
2. start session;
3. Field decision;
4. Control stale decision;
5. Director delay;
6. contradiction;
7. three reconciliation answers;
8. complete;
9. replay all events;
10. assert no duplicate effects.

## 6. Real smoke tests

Record in `docs/LIVE_TEST_EVIDENCE.md`.

### Email

- provision named inbox;
- official test email;
- real external email;
- same-thread reply;
- proactive send;
- one-word reply with quoted content;
- event IDs.

### Telegram

- BotFather token;
- real inbound;
- real reply;
- proactive send;
- restart;
- optional button.

### Discord

- real bot token;
- required intents;
- DM or controlled channel;
- real inbound/reply;
- proactive send;
- optional button.

## 7. Durable checkpoint test

1. save checkpoint N;
2. process N+1 and crash before checkpoint write;
3. restart from N;
4. replay N+1;
5. Convex dedup no-ops;
6. process N+2;
7. checkpoint advances.

## 8. Failure tests

### Delivery failure

- claim outbox;
- fail transport;
- retry bounded;
- dashboard degraded;
- restore;
- send once.

### Total Gemini outage

- exact commands still work;
- natural answer receives explicit choices;
- no transition invented.

### Stale decision

- close inject;
- send old answer;
- no state mutation;
- reply with current prompt.

### Concurrent responses

- two responses to same inject;
- one accepted;
- second returns already-answered.

### Abort

- any participant/operator sends abort;
- pending injects cancelled;
- no future sends except abort notice.

## 9. Live canonical rehearsal

Real accounts:

- Telegram Field
- Discord Control
- Email Director

Expected:

- all join;
- all injects real;
- contradiction under one second after accepted Control choice;
- reconciliation real;
- one completion;
- report complete.

Run ten times from reset.

## Performance targets

- deterministic command p95 under 2 s excluding provider delay;
- Gemini classification p95 under 6 s;
- contradiction evaluation under 100 ms;
- dashboard update under 1 s after Convex mutation;
- zero duplicate consequences in 100 replay tests;
- 10/10 rehearsal success.

## Root scripts

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run test:integration
bun run build
bun run check
```

Live:

```bash
ENABLE_LIVE_TESTS=true bun run test:live
```

## Evidence template

```md
### Test

- Date/time:
- Commit:
- Channel:
- Connection ID (redacted):
- Inbound ID:
- Conversation hash:
- Outbound ID:
- Latency:
- Screenshot:
- Result:
- Notes:
```
