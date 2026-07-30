# Caspian Buildathon — Final Research Report and Project Decision

**Research date:** 31 July 2026  
**Decision:** Build **Signal Fracture — Chaos Engineering for Human Communication**  
**Status of the previous RelayLoop recommendation:** Withdrawn. Do not use the earlier RelayLoop Codex bundle.

---

## Research integrity statement

This report distinguishes three kinds of claims:

- **Confirmed:** directly supported by official rules, the uploaded SDK source, the current official repository, or a public project page.
- **Public signal:** supported by a public post, project, or organizer-maintained issue, but not part of the formal judging rules.
- **Inference:** a reasoned conclusion drawn from confirmed evidence. It is labeled as such.

Several important facts remain impossible to verify publicly:

- The Devpost project gallery is not published.
- The public participant list is login-restricted.
- The Caspian Discord cannot be exhaustively searched without authenticated access.
- An authenticated `GET /v1/channels` response from your Caspian project was not available during research.
- Source code proves that an API is implemented, but only a live smoke test can prove that the hosted gateway exposes it correctly for your project.

The recommendation below therefore does not claim certainty. It is the strongest decision supported by the available evidence and source-level audit.

---

# 1. Executive decision

## Project name

# **Signal Fracture**

### Positioning line

**Chaos engineering for human communication.**

### One-sentence pitch

Signal Fracture is a Caspian agent that runs short fictional coordination drills across Telegram, Discord, and Email, deliberately giving each role incomplete or conflicting information, then revealing exactly where the team’s communication broke.

## The exact problem

Teams usually test infrastructure failure, but rarely test **information failure**:

- one person receives an alert that another never sees;
- one channel contains stale information;
- an escalation arrives late;
- two roles make locally reasonable decisions that conflict globally;
- nobody can reconstruct who knew what, when, or through which channel.

Traditional tabletop exercises often happen in a meeting room, shared portal, or slide deck. That removes the very fragmentation being tested.

Signal Fracture turns the team’s actual communication surfaces into the exercise.

## The people involved

The canonical fictional exercise has three roles:

1. **Field Engineer — Telegram**
2. **Mission Control — Discord**
3. **Operations Director — Email**

An optional fourth role can be added only after the core is stable.

## Why the problem naturally spans multiple channels

The channel difference is the experiment variable, not a qualification checkbox.

- Telegram creates fast, terse, mobile decisions.
- Discord represents an operational group surface.
- Email creates slower, structured, threaded decisions.
- Each participant sees a role-specific subset of facts.
- A decision on one channel changes what another participant receives elsewhere.
- Delay, omission, stale context, and contradiction can be injected independently by channel.

The product loses its central behavior if all participants are placed in one shared chat.

## Why Caspian is essential rather than decorative

Caspian provides the one communication identity and normalized message layer that lets one stateful agent privately coordinate separate participants on different platforms.

The project uses Caspian for:

- real inbound messages from all roles;
- one shared `onMessage` handler;
- channel identity and conversation IDs;
- threaded replies;
- proactive messages into existing conversations;
- attachments and rich blocks where live tests confirm them;
- channel-aware presentation;
- delivery and event evidence.

The exercise engine depends on globally shared state across separate Caspian conversations. Replacing Caspian with independent Telegram, Discord, and Email bots would fragment the system into three integration stacks and weaken the one-agent concept.

## Why judges are likely to remember it

The unforgettable visual is not a chatbot answer.

The third participant makes a decision and the dashboard suddenly draws a red causal contradiction:

> Mission Control is routing a team through Bay 3, but the Field Engineer already sealed Bay 3.

The judge can see:

- three real channels;
- three different truths;
- one agent;
- one evolving world state;
- a conflict that exists only because information was fractured;
- a final “who knew what when” reconstruction.

That is a clearer creative reveal than “the agent summarized an email and sent a notification.”

---

# 2. Evidence for the decision

## 2.1 Official rules and judging evidence

### Confirmed

The Devpost overview states:

- the project must use `caspian-sdk`;
- it must run on at least two supported channels;
- the channels must use one handler;
- the repository must be public;
- a demo video is required;
- mocked demos are not judged;
- finalists may be asked to demonstrate live;
- creativity matters substantially more than polish.

Source: [Caspian Buildathon overview](https://caspian.devpost.com/)

The full rules add:

- the demo must be three minutes or less;
- it must show the agent running on at least two channels;
- staged or edited-to-look-working integrations are not judged;
- setup instructions must be included.

Source: [Caspian Buildathon full rules](https://caspian.devpost.com/rules)

### Deadline conflict

Devpost currently exposes two conflicting deadlines:

- Overview banner: **13 August 2026, 12:00 AM IST**, which is **13 August 2026, 2:30 AM Malaysia time**.
- Full rules: **11 August 2026, 11:59 PM IST**, which is **12 August 2026, 2:29 AM Malaysia time**.

The full rules explicitly call the deadline hard.

**Decision:** Treat **12 August 2026 at 2:29 AM MYT** as the binding deadline unless the organizer confirms otherwise. Set an internal submission target of **11 August 2026 at 6:00 PM MYT**.

### Participant count conflict

Devpost currently exposes inconsistent counters:

- Overview: 62
- Rules and gallery: 89
- Other Devpost subpages have displayed different cached values

The gallery says it has not yet been published.

Source: [Project gallery](https://caspian.devpost.com/project-gallery)

**Best estimate:** approximately **89 participants**, but exact active-team count and participant plans are not publicly verifiable.

## 2.2 Caspian capabilities relevant to the idea

### Confirmed in the uploaded TypeScript SDK and official repository

The audited SDK release exposes:

- `client.onMessage(handler)`
- `message.reply(text, html, blocks, media)`
- `client.sendMessage(conversationId, text, html, blocks, media)`
- `message.typing()`
- `message.react(emoji)`
- `client.onInteraction(handler)`
- `client.onReaction(handler)`
- `client.listConversations()`
- `client.listMessages(conversationId)`
- `client.events(...)`
- `client.setWebhook(...)`
- `client.channels()`
- `client.listen(...)`
- per-conversation concurrency strategies
- inbound media
- rich provider-neutral blocks
- event polling with retry/backoff

Primary source:

- [TypeScript client source](https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/sdks/typescript/src/client.ts)
- [TypeScript SDK README](https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/sdks/typescript/README.md)

### Source-confirmed provider capabilities

At the audited commit:

| Channel             | Receive | Reply | Send to existing conversation |      Cold initiate | Interactions | Reactions |              Media |
| ------------------- | ------: | ----: | ----------------------------: | -----------------: | -----------: | --------: | -----------------: |
| Email               |     Yes |   Yes |                           Yes |                Yes |           No |        No |                Yes |
| Telegram bot        |     Yes |   Yes |                           Yes |                 No |          Yes |       Yes |                Yes |
| Discord             |     Yes |   Yes |                           Yes |                Yes |          Yes |       Yes |                Yes |
| Slack               |     Yes |   Yes |                           Yes | Provider-dependent |          Yes |       Yes |                Yes |
| Bluesky             |     Yes |   Yes |                           Yes |                 No |           No |        No |            Limited |
| X                   |     Yes |   Yes |                           Yes | Provider-dependent |           No |        No |            Limited |
| SMS/phone providers |     Yes |   Yes |                           Yes |        Usually yes |           No |        No | Provider-dependent |

These capabilities are present in source. They remain **hosted-gateway-unverified for your account** until `GET /v1/channels` and real messages confirm them.

### Free versus paid

The official README identifies Email, Telegram, Slack, Discord, and Bluesky as free channels, while paid channels draw from Caspian credit.

Source: [Official Caspian README](https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/README.md)

For the project, use:

- Email
- Telegram
- Discord

Do not make WhatsApp, SMS, X, voice, or iMessage part of the judged core.

### Stability finding

The repository is developing very quickly. In the days immediately preceding this research, commits added or fixed:

- malformed-event listener crashes;
- atomic outbox claiming;
- Telegram card-image rendering;
- MMS;
- Slack socket mode;
- Bluesky;
- interactions, reactions, attachments, and rich blocks.

Source: [Caspian commit history](https://github.com/TryCaspian/caspian-sdk/commits/main/)

**Inference:** Advanced features are real but young. Text replies, stored conversation IDs, and proactive text sends should form the core. Buttons, reactions, blocks, and media should enhance the demo only after smoke tests pass.

## 2.3 Organizer and judge signals

### Confirmed public evidence

Rushant Ashtputre is listed as the judge and founder of Caspian on the Devpost page.

Public Caspian positioning repeatedly emphasizes:

- connecting agents to humans rather than merely agent-to-agent protocols;
- one identity across human communication surfaces;
- removing channel plumbing;
- building useful agents that can actually reach people.

Source: [Caspian README](https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/README.md)

A current organizer-maintained Caspian issue evaluating agent projects highlights:

- a sharp concrete problem;
- code quality;
- plausible or real usage;
- Caspian as the communication layer rather than an add-on;
- one idiomatic handler.

Source: [Caspian agent challenge issue #118](https://github.com/TryCaspian/caspian-sdk/issues/118)

### Inference

The formal buildathon criterion remains creativity. The public organizer signals suggest that novelty will be more convincing when it also demonstrates:

- a clear job;
- real communication;
- a credible post-demo use;
- disciplined engineering;
- Caspian at the center.

Signal Fracture satisfies this better than a pure novelty bot because the surprising behavior also maps to real training and incident-readiness workflows.

## 2.4 Previous judging patterns

Verified winners and finalists from creativity- and agent-focused hackathons repeatedly show the same pattern:

1. The product is explainable in one sentence.
2. The demo contains an immediate state change.
3. The system does something, rather than only answering.
4. Sponsor technology is structurally central.
5. A rough but complete loop beats a large incomplete system.
6. Quirky or unexpected behavior is an advantage when the value becomes obvious during the demo.

Examples reviewed:

- [AI Agents Hackathon gallery](https://ai-agents-hackathon.devpost.com/project-gallery)
- [IntelliSupply](https://devpost.com/software/intellisupply)
- [FocusIQ](https://devpost.com/software/focusiq)

**Inference:** Signal Fracture’s red contradiction edge and cross-channel causal chain provide a stronger “state change” than a normal assistant response.

## 2.5 Current competitor patterns

### Public Caspian projects already found

The following categories already have visible Caspian implementations or submissions:

- infrastructure remediation;
- placement-email extraction and reminders;
- GitHub maintenance;
- generic support;
- placement coaching;
- PR awareness;
- human approvals;
- travel planning;
- freelancer communication;
- Caspian documentation RAG;
- tenant/PG operations.

Sources:

- [Caspian agent submissions, issue #118](https://github.com/TryCaspian/caspian-sdk/issues/118)
- [PGOps — public Caspian Buildathon entry](https://github.com/ritz541/pgops)

### Crowded idea classes

High collision risk:

- email triage;
- customer support;
- general personal assistant;
- scheduling/reminders;
- sales/CRM;
- CI or PR notifications;
- study or placement assistant;
- travel planning;
- generic inbox;
- generic approval/escalation;
- tenant operations;
- developer-documentation assistant.

Signal Fracture is outside these crowded classes.

## 2.6 Similar products and material differentiation

Existing crisis/tabletop products were found:

- [Kautiq](https://kautiq.com/)
- [CrisisPlay](https://www.crisisplay.com/)
- [Crisis TTX](https://www.crisisttx.com/)
- [DrillsForge](https://www.drillsforge.com/)
- [ScenX](https://scenx.ai/)

They already offer combinations of:

- role-based simulations;
- timed injects;
- adaptive scenarios;
- dashboards;
- scoring;
- after-action reports;
- Slack or Teams delivery in some cases.

Therefore, **“AI crisis simulator” is not unique**.

Signal Fracture must be materially different:

1. **Communication failure is the subject.**  
   The product is not mainly generating a crisis scenario. It deliberately faults the information graph.

2. **No shared participant portal.**  
   Each person operates through a different real channel.

3. **Asymmetric truth is first-class.**  
   The system stores what each role knows and when they learned it.

4. **Cross-channel decisions are causal.**  
   A decision on Telegram changes injects on Discord and Email.

5. **The main output is epistemic reconstruction.**  
   The dashboard and report answer “who knew what when,” not merely “what score did the team get?”

6. **Short, repeatable drills.**  
   The hackathon version targets a five-to-ten-minute exercise rather than an enterprise simulation platform.

## Estimated collision risk

# **Medium**

Not low, because role-based tabletop platforms and AI inject engines already exist.

Not high, because no reviewed public Caspian submission or directly comparable product centered on deliberate cross-channel information fractures and per-role knowledge-state reconstruction.

## Confidence level

- **Confidence this is the strongest concept found:** 80–85%
- **Confidence it is technically feasible after the smoke tests:** 80%
- **Confidence that no other participant is building something similar:** impossible to establish; public gallery is unavailable
- **Confidence it is stronger than RelayLoop:** approximately 90%

These are judgment estimates, not measured probabilities.

---

# 3. The unforgettable demo moment

## Fictional scenario

### **Asteria Station: Bay 3 Pressure Event**

Every participant-facing message begins with:

> EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY

## Sequence

### Step 1 — Field Engineer starts on Telegram

The Field Engineer receives:

> Pressure is rising in Bay 3. Local sensor confidence: 71%.  
> Choose: SEAL BAY 3, INSPECT, or WAIT.

They reply:

> SEAL BAY 3

The single handler records:

- role: Field Engineer;
- decision: seal Bay 3;
- timestamp;
- facts known to that role;
- channel and conversation;
- causal consequences.

### Step 2 — Mission Control acts on Discord

Mission Control has not received the field decision. Instead, it sees older telemetry:

> Bay 3 appears passable. Crew 7 needs the shortest route to the cooling manifold.  
> Choose: ROUTE BAY 3 or ROUTE BAY 5.

Mission Control replies:

> ROUTE BAY 3

### Step 3 — Operations Director receives Email

The Director receives a structured situation report that mentions a pressure anomaly but not the field seal:

> Decide whether to notify the station commander now or wait for confirmation.

The Director replies by email:

> WAIT FOR CONFIRMATION

### Step 4 — The contradiction appears

The deterministic engine compares decisions and facts.

The dashboard draws a red edge:

```text
Field: BAY 3 SEALED
        conflicts with
Control: CREW ROUTED THROUGH BAY 3
```

The agent immediately sends private reconciliation injects:

**Telegram to Field**

> Mission Control is routing Crew 7 through Bay 3. Confirm whether the seal blocks passage.

**Discord to Mission Control**

> New field state conflicts with your route. Choose REROUTE BAY 5 or REQUEST OVERRIDE.

**Email to Director**

> Coordination fault detected: operational routing conflicts with field containment. Escalate now?

### Step 5 — Shared state resolves

The participants respond.

The engine records:

- time to detect contradiction;
- knowledge divergence duration;
- time to reconciliation;
- which channel introduced delay;
- whether the escalation path worked.

### Step 6 — The judge sees the debrief

The dashboard changes from the live topology to:

# WHO KNEW WHAT, WHEN?

A timeline shows:

- Field knew the bay was sealed at T+18s.
- Mission Control chose the route at T+31s without that fact.
- Director delayed escalation at T+44s.
- Signal Fracture detected the contradiction at T+45s.
- Team reconciled at T+67s.

## Why a notification bot cannot reproduce this

A notification bot distributes the same fact.

Signal Fracture:

- partitions facts;
- introduces controlled faults;
- maintains separate knowledge states;
- applies deterministic causal rules;
- changes future messages based on participant decisions;
- detects conflicts between local decisions;
- produces an auditable information-flow reconstruction.

The communication behavior itself is the product.

---

# 4. Complete product behavior

## Main user flow

1. The operator creates a fictional exercise session.
2. The system generates one invite code per role.
3. Each participant messages the Caspian agent from their assigned channel:
   - `JOIN ASTERIA FIELD <code>`
   - `JOIN ASTERIA CONTROL <code>`
   - `JOIN ASTERIA DIRECTOR <code>`
4. The handler binds the Caspian `conversationId` to the role.
5. The operator starts the exercise.
6. The deterministic scenario engine sends role-targeted injects.
7. Participants respond through text commands or natural language.
8. Gemini converts natural-language decisions into a constrained schema.
9. Deterministic rules apply consequences and create later injects.
10. The contradiction engine compares role knowledge, decisions, and world state.
11. The agent sends reconciliation prompts.
12. The session ends automatically or through `ABORT`.
13. The dashboard produces an after-action report.

## Roles

### Operator/facilitator

Can:

- create/reset a fictional session;
- assign role invite codes;
- start, pause, resume, and abort;
- see all facts and delivery states;
- inject a pre-approved fictional event;
- end the exercise;
- view and export the after-action report.

Cannot:

- impersonate a participant;
- silently approve decisions;
- falsify delivery evidence.

### Participant

Can:

- join one role;
- receive private injects;
- reply with a decision;
- request current known facts with `STATUS`;
- request command help;
- leave or abort participation.

### Signal Fracture agent

Must:

- enforce role identity;
- deliver only the role’s allowed facts;
- parse decisions conservatively;
- apply deterministic consequences;
- preserve idempotency;
- detect contradictions;
- maintain role knowledge state;
- fail safely;
- disclose that all scenarios are fictional.

## Supported channels

Judged target:

- Telegram
- Discord
- Email

Minimum fallback:

- Telegram and Email, with three participants using separate conversations.

## Agent responsibilities

- role onboarding;
- channel-aware rendering;
- scenario sequencing;
- decision extraction;
- contradiction detection;
- delivery tracking;
- retries;
- debrief generation;
- audit evidence.

## Memory and state

The system stores:

- scenario session;
- role assignment;
- participant endpoint;
- world facts;
- knowledge facts per role;
- injects;
- decisions;
- contradictions;
- delivery attempts;
- event IDs;
- timeline;
- metrics.

It must not rely on process memory for correctness.

## Dashboard

Required panels:

1. **Channel status**
2. **Role topology**
3. **World-state facts**
4. **Per-role knowledge**
5. **Inject timeline**
6. **Decision timeline**
7. **Contradiction graph**
8. **Delivery/model latency**
9. **Retries and deduplication**
10. **After-action report**

The dashboard is an evidence surface, not the participant interface.

## Human approval points

The fictional exercise does not execute real-world operations.

Human controls:

- operator starts the session;
- participants make every scenario decision;
- operator can abort;
- report recommendations remain advisory.

## Error handling

### Model uncertainty

- Do not advance the scenario.
- Ask one concise clarification.
- After two failed clarifications, show valid commands.

### Duplicate inbound event

- Return or display the previously stored result.
- Do not create a second decision or second consequence.

### Stale decision

- Explain that the inject is closed.
- Show the currently active decision prompt.

### Channel delivery failure

- Mark the role as delivery-degraded.
- Retry using a stable idempotency key.
- Pause that branch if the next decision depends on the failed inject.
- Never pretend the participant received it.

### Agent restart

- Recover all session state from Convex.
- Reconcile the event stream from the saved checkpoint.
- Resume pending outbox deliveries.
- Do not repeat completed consequences.

## Privacy and security

- Use fictional scenarios and synthetic documents.
- Store minimum participant metadata.
- Do not display raw email addresses or usernames on the public dashboard.
- Use opaque participant aliases.
- Redact raw private messages from published logs.
- Protect operator controls with server-side authentication.
- Use signed, expiring role codes.
- Never commit API keys or bot tokens.

## Abuse prevention

- Rate-limit joins and responses.
- Cap message size.
- Reject real emergency dispatch requests.
- Reject violent operational planning outside the clearly fictional exercise.
- Prevent unsolicited cold outreach.
- Allow `ABORT` at any time.
- Add visible exercise labels to every inject.

## When a channel fails

The exercise does not silently substitute another channel.

Fallback is allowed only when:

- the same participant previously linked a secondary endpoint;
- the dashboard records that fallback occurred;
- the demo clearly discloses it.

## When the agent is uncertain

The LLM may interpret wording, but it cannot:

- invent a decision;
- create new operational facts;
- skip consent;
- alter deterministic state transitions;
- generate an unapproved scenario branch.

---

# 5. Technical architecture

## Recommended stack

- **Language:** TypeScript
- **Runtime/package manager:** Bun
- **Agent process:** long-running Node/Bun worker
- **Communication:** `caspian-sdk`
- **Database/backend:** Convex
- **Web:** Next.js + React
- **Validation:** Zod
- **LLM:** Gemini 3.5 Flash-Lite
- **Fallback LLM:** Gemini 3.1 Flash-Lite
- **Tests:** Vitest
- **Dashboard E2E:** Playwright
- **Agent hosting:** Railway, Fly.io, or Render persistent worker
- **Web hosting:** Vercel
- **State/functions:** hosted Convex

Do not use Lambda for the Caspian listener. The official SDK’s serverless webhook-dispatch mode remains an open issue.

Source: [Issue #82 — serverless webhook handler](https://github.com/TryCaspian/caspian-sdk/issues/82)

## Single-handler design

Qualification path:

```ts
client.onMessage(async (message) => {
  await handleInboundMessage({
    id: message.id,
    conversationId: message.conversationId,
    connectionId: message.connectionId,
    channel: message.channel,
    sender: message.sender,
    subject: message.subject,
    text: message.text ?? "",
    media: message.media,
  });
});
```

There is exactly one message handler.

Optional button and reaction handlers may invoke the same domain dispatcher, but they are never required for qualification or for the canonical demo. Every action must work through text.

## Channel setup

```ts
await client.connectEmail({ username: "signal-fracture" });
await client.connectTelegram({ botToken: env.TELEGRAM_BOT_TOKEN });
await client.connectDiscord({ botToken: env.DISCORD_BOT_TOKEN });
```

Use exact signatures from the installed package and current live guide. Do not copy these examples blindly if the installed types differ.

## Full message flow

```text
Telegram / Discord / Email
          |
          v
     Caspian gateway
          |
          v
one client.onMessage handler
          |
          v
inbound idempotency check by message.id
          |
          v
resolve role by conversationId
          |
          +--> deterministic command parser
          |
          +--> Gemini structured decision parser if needed
          |
          v
Convex atomic scenario transition
          |
          v
deterministic causal + contradiction engine
          |
          v
create outbox deliveries with stable keys
          |
          v
client.sendMessage(conversationId, ...)
          |
          v
Caspian sends to each participant's original channel
          |
          v
audit timeline + dashboard update
```

## Agent model boundary

Gemini performs:

- constrained decision extraction;
- rationale summarization;
- optional after-action prose;
- clarification question generation.

Deterministic code performs:

- role authentication;
- active-inject validation;
- world-state transitions;
- fact visibility;
- fault injection;
- contradiction detection;
- timers;
- scoring;
- retries;
- idempotency;
- report metrics.

## Gemini configuration

Use exact current API IDs:

```text
gemini-3.5-flash-lite
gemini-3.1-flash-lite
```

Official sources:

- [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite)
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

Your dashboard showed 500 requests/day for each Flash-Lite model. That is sufficient if deterministic commands bypass the LLM and the demo uses at most one extraction call per natural-language response.

## Convex data model

### `sessions`

- scenario ID
- status
- tenant/demo ID
- start/end timestamps
- current virtual time
- version

### `roles`

- session ID
- role key
- public alias
- invite-code hash
- status

### `endpoints`

- role ID
- channel
- Caspian conversation ID
- connection ID
- sender fingerprint
- active
- timestamps

### `worldFacts`

- fact key
- value
- truth status
- source
- createdAt
- supersedes fact ID

### `roleKnowledge`

- role ID
- fact ID
- learnedAt
- source inject ID
- confidence
- staleAt

### `injects`

- session ID
- role ID
- content
- allowed decisions
- prerequisite
- delivery policy
- state
- scheduledAt
- sentAt
- expiresAt

### `decisions`

- inject ID
- role ID
- normalized action
- raw text, redacted as needed
- rationale
- confidence
- receivedAt
- appliedAt
- idempotency key

### `contradictions`

- session ID
- left fact/decision
- right fact/decision
- severity
- detectedAt
- resolvedAt
- resolution

### `inboundEvents`

- Caspian message ID
- conversation ID
- channel
- processing state
- result reference

### `deliveries`

- stable idempotency key
- conversation ID
- semantic type
- payload hash
- status
- attempt count
- last error
- next attempt

### `eventCheckpoints`

- project/environment
- highest reconciled event sequence
- updatedAt

### `auditEvents`

- type
- safe metadata
- references
- timestamp

## Authentication

### Participants

A role is bound only when:

- a valid expiring role code is supplied;
- the endpoint is not already bound elsewhere;
- the Caspian conversation ID is stored;
- the binding is atomically consumed.

### Operator

Use:

- a server-only admin session;
- protected Convex mutations;
- no public reset endpoint;
- no participant impersonation control.

## Queue and event design

Convex acts as the durable application state and outbox.

Caspian’s gateway source includes its own durable provider outbox, but the application still needs its own delivery intent record so retries and scenario state remain idempotent.

## Cursor and restart behavior

Important SDK limitation:

- `listen()` starts from the latest sequence unless `fromSeq` is supplied.
- The listener’s sequence is internal and not exposed as a persistence callback.
- The SDK does not yet provide a distributed state/dedup adapter.

Source: [Issue #83](https://github.com/TryCaspian/caspian-sdk/issues/83)

Recommended approach:

1. Run one persistent worker instance.
2. Deduplicate every message using Caspian `message.id`.
3. Persist all application transitions in Convex.
4. Add a small reconciliation loop using `client.events({ afterSeq })`.
5. Persist the highest reconciled event sequence.
6. On restart, reconcile missed events before resuming normal operation.
7. Prove this behavior with an induced restart test.

Do not deploy multiple active listener instances unless a distributed lock is implemented.

## Idempotency keys

Examples:

```text
inbound:<messageId>
decision:<injectId>:<roleId>
inject:<injectId>:role:<roleId>
contradiction:<leftId>:<rightId>
resolution:<contradictionId>:role:<roleId>
session:<sessionId>:completed
```

## Retry behavior

- maximum three application delivery attempts;
- exponential backoff with jitter;
- do not generate new text on retry;
- reuse the exact stored payload;
- do not advance dependent branches until required delivery succeeds;
- show permanent failure in the dashboard.

## Logging and observability

Structured log fields:

- event type
- request ID
- Caspian message ID
- conversation ID hash
- session ID
- role ID
- channel
- model
- latency
- attempt
- transition
- error code

Never log:

- tokens;
- API keys;
- full participant addresses;
- full private messages;
- hidden model reasoning.

## Demo environment

Use:

- a dedicated Convex deployment or demo tenant;
- three controlled participant accounts;
- fixed fictional scenario data;
- real Caspian delivery;
- no fake channel events;
- a guarded reset that clears demo state only.

---

# 6. Caspian compliance

## `caspian-sdk` usage

The project directly uses the official TypeScript SDK for:

- channel connection;
- receiving;
- replying;
- proactive sends;
- conversation addressing;
- event evidence.

## Two or more supported channels

Target:

- Telegram
- Discord
- Email

Minimum accepted fallback:

- Telegram and Email

## One shared handler

Exactly one `client.onMessage(...)` registration processes all message channels.

The handler calls one channel-neutral business dispatcher. No duplicated Telegram, Email, or Discord workflow handlers exist.

## Real incoming and outgoing communication

The judged flow requires:

- real participant messages;
- real Caspian `message.received` events;
- real `message.reply` or `sendMessage`;
- real messages visible in the channel clients;
- real event IDs and timestamps in evidence.

## Public repository

The README must link to:

- the exact handler;
- channel setup;
- architecture;
- live evidence;
- tests;
- deployment;
- limitations.

## Working demo

The demo must show:

- three real channel windows;
- one dashboard;
- live causal state;
- one contradiction;
- real replies;
- no edited-to-look-working sequence.

## Live-demo readiness

Required:

- ten successful full rehearsals;
- pre-linked backup accounts;
- text-command fallback;
- persistent worker;
- no local-only dependencies;
- exact reset procedure;
- backup network;
- redacted logs;
- one clean backup video.

## Items to verify with organizers before full development

1. Which deadline is binding:
   - 11 August 23:59 IST in full rules, or
   - 13 August 00:00 IST on the overview.
2. Whether a separate `onInteraction` handler is acceptable as an optional enhancement when all qualifying behavior remains in one `onMessage` handler.
3. Whether the public repository must remain public for a specific period after judging.
4. Whether synthetic fictional scenario content is acceptable. It should be, but confirmation removes ambiguity.

## Items to verify through your Caspian project

1. Authenticated `GET /v1/channels`
2. Email provisioning and deliverability
3. Telegram connection
4. Discord connection and required intents
5. Proactive `sendMessage` on all target channels
6. Hosted rich-block rendering
7. Hosted interaction events
8. Hosted media delivery
9. Event polling and message IDs
10. Reply and conversation daily caps

---

# 7. Solo build plan

## Safe schedule

Assume the hard deadline is **12 August 2026 at 2:29 AM MYT**.

### 31 July — qualification spike

Build only:

- empty TypeScript/Bun repository;
- install `caspian-sdk`;
- create Caspian project/key;
- query `/v1/channels`;
- connect Email;
- connect Telegram;
- register one handler;
- receive and reply on both;
- store `message.id` and `conversationId`;
- send proactive text to both stored conversations.

**Go/no-go checkpoint:** If two-channel inbound, reply, and proactive send do not work reliably within two to three hours, do not begin the full product.

### 1 August — Discord and durable identity

- Connect Discord.
- Capture three role endpoints.
- Initialize Convex.
- Implement role code binding.
- Add inbound deduplication.
- Create one shared command parser.
- Test `JOIN`, `STATUS`, `HELP`, `ABORT`.

### 2 August — deterministic scenario engine

- Build scenario graph schema.
- Implement world facts.
- Implement per-role knowledge.
- Implement inject prerequisites.
- Implement allowed decisions.
- Implement deterministic consequences.
- Implement controlled fault types:
  - delay;
  - omission;
  - stale fact;
  - contradiction;
  - escalation failure.

### 3 August — Gemini boundary

- Implement Zod structured output.
- Add Gemini 3.5 Flash-Lite primary.
- Add Gemini 3.1 Flash-Lite fallback.
- Parse natural-language decisions.
- Add one clarification turn.
- Ensure commands and state transitions bypass Gemini.
- Add unsafe/real-emergency rejection.

### 4 August — causal delivery and outbox

- Create Convex outbox.
- Implement stable delivery keys.
- Implement proactive sends.
- Implement retry and permanent failure.
- Implement session pause when a required inject fails.
- Add audit events.

### 5 August — contradiction engine

- Detect:
  - incompatible decisions;
  - action based on stale fact;
  - missing escalation;
  - mutually exclusive world state;
  - role expectation mismatch.
- Generate deterministic reconciliation injects.
- Complete the canonical Asteria Station scenario.

### 6 August — dashboard

- Role topology.
- World facts.
- Per-role knowledge.
- Delivery timeline.
- Contradiction edge.
- Latency panel.
- Session controls.
- Mobile-safe recording layout.

### 7 August — after-action report

- “Who knew what when” timeline.
- Time to contradiction.
- Knowledge divergence duration.
- Reconciliation time.
- Delivery latency by channel.
- Duplicate count.
- Generate concise Gemini narrative from deterministic metrics.
- Add Markdown/PDF-ready export only if simple.

### 8 August — reliability

- Restart reconciliation.
- Concurrent responses.
- Duplicate events.
- Email quoted-reply parsing.
- Model fallback.
- total model outage;
- Discord/Telegram delivery failures;
- aborted exercise;
- stale response;
- expired role code.

### 9 August — deployment

- Deploy Convex.
- Deploy web.
- Deploy one persistent agent worker.
- Configure health/readiness.
- Verify no local dependency.
- Run externally from real devices/accounts.

### 10 August — rehearsal and feature freeze

- Run ten exact scenario rehearsals.
- Measure latency.
- Fix only reliability and comprehension problems.
- Freeze the feature set at midnight.
- Complete test evidence.

### 11 August — video, repository, submission

- Record primary video under three minutes.
- Record backup take.
- Verify fresh clone.
- Run full checks.
- Make repository public.
- Test all links incognito.
- Submit by **6:00 PM MYT**.

## Fallback scope

Keep:

- Email + Telegram;
- three role conversations;
- one shared handler;
- fixed Asteria scenario;
- text commands;
- deterministic knowledge/contradiction engine;
- simple dashboard;
- after-action timeline.

## Drop first if behind

1. scenario editor;
2. generated scenario images;
3. button callbacks;
4. reactions;
5. rich blocks;
6. multiple scenario library;
7. fourth role;
8. PDF export;
9. advanced visual animation;
10. participant accounts;
11. SMS/voice;
12. compliance framework mapping.

---

# 8. Validation experiments

All initial experiments should fit within a few hours.

## 1. SDK and channel discovery

Run authenticated:

```bash
curl -fsS https://api.trycaspianai.com/v1/channels \
  -H "Authorization: Bearer $CASPIAN_API_KEY"
```

Record:

- channel;
- availability;
- credentials;
- capabilities;
- cost;
- setup guide.

## 2. One-handler two-channel test

Connect Email and Telegram.

Expected:

- both invoke the same function;
- logs show the same handler path;
- each receives a real reply;
- no channel-specific business handler exists.

## 3. Conversation-state test

- Email participant joins FIELD.
- Telegram participant joins CONTROL.
- Persist both conversation IDs.
- Restart the worker.
- Send `STATUS` from both.
- Confirm the roles survive restart.

## 4. Proactive send test

After receiving one message on each channel:

```ts
await client.sendMessage(savedConversationId, "EXERCISE test inject");
```

Expected:

- arrives in correct existing conversation;
- source message is real;
- event evidence exists;
- no duplicate send.

## 5. Webhook/event test

Even if polling remains primary:

- inspect `message.received` and `message.sent`;
- record event sequence;
- restart;
- reconcile missed sequence;
- replay duplicate;
- confirm one state transition.

## 6. Failure and retry test

- temporarily invalidate one delivery destination or inject a transport error;
- create one outbox item;
- verify bounded retry;
- restore transport;
- verify exact payload delivered once.

## 7. Email quote test

Reply to an exercise email with a one-word decision.

Expected:

- quoted prior content is removed;
- parser reads only the new answer;
- contradictory words in quoted text do not confuse the decision.

A public Caspian user reported this exact live issue in an approval workflow.

Source: [Checkpoint submission in issue #118](https://github.com/TryCaspian/caspian-sdk/issues/118)

## 8. Button and media tests

Run separately from the core.

- one Telegram button;
- one Discord button;
- one image attachment;
- one interaction event;
- one text fallback.

Failure does not block the project.

## 9. Gemini latency and quota test

Run 30 structured extraction calls using the canonical response schema.

Measure:

- valid JSON rate;
- p50 and p95 latency;
- repair rate;
- primary failure;
- fallback success.

Keep runtime requests below ten per minute in the application.

## 10. Mini-scenario test

Use three real conversations and only two injects.

Expected:

- Field decision changes Control inject;
- contradiction engine detects one conflict;
- dashboard updates;
- all state is durable.

## Go/no-go criteria

Proceed only when:

- two real channels receive and send;
- one handler is proven;
- saved conversation IDs support proactive send;
- inbound IDs deduplicate;
- state survives restart;
- end-to-end latency is acceptable for a live demo.

---

# 9. Winning strategy

## Title

# **Signal Fracture — Chaos Engineering for Human Communication**

## Subtitle

> A Caspian agent that deliberately breaks a fictional team’s information flow across Telegram, Discord, and Email, so they can discover coordination failures before reality does.

## README emphasis

The first screen of the README should contain:

1. the one-sentence pitch;
2. a three-role diagram;
3. a screenshot/GIF of the red contradiction edge;
4. the exact single-handler source link;
5. three real channel badges;
6. one sentence explaining what is deterministic and what Gemini does;
7. live evidence;
8. a link to the demo video.

Do not begin with installation instructions or a generic AI paragraph.

## First 20 seconds of the video

Show three windows and the dashboard.

Say:

> These three people are responding to the same fictional incident, but none of them sees the same truth. Signal Fracture is about to make their individually reasonable decisions collide.

Then trigger the third decision and show the red contradiction.

## Ideal demo video structure

The full rules cap the video at three minutes.

### 0:00–0:20 — hook

- show three channels;
- explain asymmetric truth;
- show all three are real.

### 0:20–0:55 — role-specific injects

- Telegram Field;
- Discord Control;
- Email Director.

### 0:55–1:35 — causal conflict

- make two decisions;
- show contradiction appear;
- send reconciliation messages.

### 1:35–2:10 — resolution and report

- show resolution;
- show “who knew what when”;
- show metrics.

### 2:10–2:35 — Caspian proof

- show exact shared handler;
- show message/event IDs;
- show channel connection lines.

### 2:35–2:50 — close

> One agent. Three channels. Three partial truths. One coordination failure revealed before it became real.

Leave ten seconds of buffer.

## What not to waste time building

- generalized enterprise platform;
- scenario marketplace;
- dozens of scenarios;
- authentication product;
- payments;
- voice;
- SMS;
- AI-generated 3D environment;
- autonomous emergency advice;
- complex scoring model;
- vector database;
- mobile app;
- integrations beyond Caspian, Convex, and Gemini.

## Likely live-demo challenges and answers

### “Is this just another tabletop simulator?”

> Normal tabletop software simulates the incident. Signal Fracture faults the communication graph itself. Each role has a different knowledge state on a different real channel, and the system reconstructs how contradictory local decisions emerged.

### “Why does it need Caspian?”

> The separate private conversations are the exercise. Caspian lets one agent reach each role where they already communicate, while one handler and one state engine preserve the shared causal world.

### “Could this be done with three Slack channels?”

> It could imitate role separation, but it would remove the heterogeneous-channel failure mode. Email delay, Telegram brevity, and Discord operational context are deliberately different parts of the exercise.

### “Is AI deciding what people should do in an emergency?”

> No. Every scenario is fictional and labeled. Humans make decisions. Deterministic code controls state. Gemini only parses wording and writes the debrief narrative.

### “What if buttons fail?”

> Every action works by text. Buttons and reactions are optional presentation enhancements.

### “How do you prevent duplicate consequences?”

> Caspian message IDs are stored, Convex transitions are atomic, and every outbound effect has a stable idempotency key.

### “What happens if a channel fails?”

> The affected branch pauses, the failure is visible, retries are bounded, and the system never claims the participant received an inject.

## Measurable result

Use actual demo metrics:

- time to contradiction detection;
- knowledge divergence duration;
- time to reconciliation;
- delivery latency by channel;
- duplicate transitions;
- successful rehearsal rate.

Target evidence:

- 10/10 complete rehearsals;
- zero duplicate state transitions;
- contradiction detected within one deterministic transition;
- all three proposal/inject deliveries evidenced.

## Making Caspian visibly central

- Show the exact `client.onMessage` handler.
- Display channel and conversation ID hashes in the event timeline.
- Show messages arriving in real clients.
- Show proactive sends into stored conversations.
- Include redacted Caspian event records.
- Explain that the dashboard never creates a participant message.

---

# 10. Brutal risk assessment

## Technical risk — Medium-high

### Why

The SDK is young and recently received several reliability fixes.

### Mitigation

- pin exact SDK version;
- use text as the canonical transport;
- keep one persistent worker;
- own idempotency in Convex;
- smoke-test before product work;
- avoid unverified APIs in the core.

## Channel reliability — Medium

### Why

Email can be delayed or land in spam. Discord permissions and Telegram bot setup can fail.

### Mitigation

- warm all channels before recording;
- use real controlled accounts;
- maintain text-only fallback;
- keep two-channel safe scope;
- record delivery latency;
- use a backup network and backup accounts.

## API risk — Medium

### Why

`sendMessage` is source-confirmed, but hosted behavior must be verified. Rich blocks and interactions may differ from documentation.

### Mitigation

- test proactive text first;
- capture all role conversation IDs through JOIN;
- never depend on cold `initiate`;
- make buttons/media optional;
- query `/v1/channels`.

## Listener/cursor risk — Medium-high

### Why

The SDK listener does not expose durable cursor callbacks, and distributed state support is an open issue.

### Mitigation

- one worker instance;
- persistent message-ID dedup;
- event reconciliation worker;
- saved event checkpoint;
- restart test before recording.

## Scope risk — High

### Why

A general simulation platform is too large for a solo entrant.

### Mitigation

Build exactly:

- one scenario;
- three roles;
- five-to-ten-minute session;
- four fault types;
- one dashboard;
- one AAR.

Everything else is optional.

## Idea-collision risk — Medium

### Why

Crisis simulation and AI tabletop products already exist.

### Mitigation

Position and implement the unique mechanism:

- communication chaos engineering;
- heterogeneous channels;
- asymmetric role knowledge;
- faulted information graph;
- causal cross-channel decisions;
- epistemic reconstruction.

Do not market it as simply “an AI crisis simulator.”

## Safety risk — Medium

### Why

A realistic-looking exercise could be confused with emergency advice.

### Mitigation

- visible fictional-exercise label on every message;
- no real emergency integration;
- no weapons or tactical instructions;
- `ABORT`;
- clear refusal for real emergencies;
- synthetic data only;
- focus on communication process, not operational response doctrine.

## Demo risk — Medium-high

### Why

Three channels and three participants create coordination and timing risk.

### Mitigation

- controlled accounts;
- exact scripted inputs;
- deterministic scenario;
- text commands;
- ten rehearsals;
- prepared reset;
- backup take;
- dashboard and terminal evidence.

## Gemini quota risk — Low

### Why

The user’s free tier provides 500 RPD on both selected Flash-Lite models.

### Mitigation

- one call per non-command decision at most;
- deterministic commands;
- primary/fallback routing;
- cached result;
- local fixtures for tests.

## Dependence on paid services — Low

Core services:

- Caspian free channels;
- Gemini free tier;
- Convex free tier;
- Vercel;
- a persistent worker host, potentially free or low-cost.

Do not use paid SMS/voice in the judged flow.

## Dependence on unverified Caspian features — Medium

Core dependency still requiring live verification:

- proactive text send to stored conversation ID.

Optional dependencies:

- blocks;
- buttons;
- reactions;
- media.

The project should be abandoned or redesigned if proactive sending is not reliable during the qualification spike.

## Adoption evidence risk — Medium

### Why

The demo uses controlled participants rather than a real organization.

### Mitigation

- recruit two student friends for one genuine blind rehearsal;
- record their debrief;
- include measured results;
- provide a one-command local exercise;
- keep the agent publicly reachable for judges if safe.

This is optional evidence, not a market-validation burden for you.

---

# 11. Final verdict

## Why this is the best idea found

Signal Fracture offers the best combination of:

- surprise;
- central Caspian use;
- visible multi-person causality;
- genuine need for different channels;
- a memorable live state change;
- solo feasibility;
- deterministic reliability;
- credible post-hackathon usefulness.

It is not the most technically complex idea. That is a strength. Its novelty is in the interaction model.

## Why the runner-ups were rejected

### Runner-up 1 — Cross-channel ARG / social-deduction game master

**Strength:** slightly higher pure novelty and strong entertainment value.

**Rejected because:**

- easier to dismiss as a game bot;
- weaker real-world utility;
- more content-writing burden;
- harder to explain why the same system matters after the demo;
- more likely to depend on subjective AI narration.

### Runner-up 2 — RelayLoop cooperation-cycle matcher

**Strength:** elegant three-person loop and strong Caspian centrality.

**Rejected because:**

- skill-swap and barter projects are common;
- formal multi-party barter cycles already exist in prior work;
- judges may mentally categorize it as “another SkillSwap app” before seeing the deeper mechanism;
- its collision risk is higher than initially estimated.

## Internal weighted scoring

Weights specified in the original request:

- creativity: 30%
- Caspian centrality: 20%
- low collision: 15%
- demo memorability: 15%
- solo feasibility: 10%
- reliability: 5%
- usefulness: 5%

| Candidate                      | Weighted score / 10 |
| ------------------------------ | ------------------: |
| Signal Fracture                |           **9.115** |
| Cross-channel ARG              |               9.020 |
| Witness Mesh                   |               8.715 |
| RelayLoop                      |               8.680 |
| Human Checksum                 |               8.655 |
| Quiet Council                  |               8.580 |
| Accessibility Relay            |               8.435 |
| Private lost-and-found matcher |               8.140 |

A sensitivity simulation that varied the weights around the requested model placed Signal Fracture first in approximately 95.6% of runs and the ARG first in approximately 4.4%. This only shows robustness to the subjective scoring assumptions; it is not a prediction of judging.

## Realistic probability range

Assuming:

- three real channels;
- one handler;
- a complete canonical scenario;
- reliable proactive delivery;
- a clear red-contradiction demo;
- ten rehearsals;
- strong evidence and README;

Subjective estimates:

- **Any prize/top-three:** 20–40%
- **First place:** 8–18%

These are not statistical forecasts. A public gallery, judge feedback, or idea collision could materially change them.

A basic alerting or scenario-summary version would have a substantially lower chance.

## First exact action

Create an empty repository and run the qualification spike before writing any product code:

```bash
mkdir signal-fracture
cd signal-fracture
bun init -y
bun add caspian-sdk zod
```

Then prove, in this order:

1. Email receives and replies.
2. Telegram receives and replies through the exact same handler.
3. Both conversation IDs are saved.
4. `sendMessage` reaches both stored conversations.
5. The worker restarts without producing duplicate effects.

Do not proceed to the dashboard until those five checks pass.

---

# Appendix A — Confirmed SDK constraints that must shape the implementation

1. Telegram bots cannot cold-initiate a conversation; users must message first.
2. Capture every role’s conversation through `JOIN`.
3. `sendMessage` can proactively send to an existing conversation.
4. A public Caspian submission reported that `initiate()` did not return a conversation ID; avoid it in the core.
5. Email replies may contain quoted prior content; strip quotes before parsing.
6. Replies are limited by a gateway loop-prevention cap of 25 outbound replies per conversation in 24 hours in the audited source.
7. The sandbox-project mint endpoint is rate-limited to five requests per hour per IP in the audited source.
8. `listen()` is a persistent polling loop.
9. Serverless SDK dispatch remains an open issue.
10. Cross-invocation dedup/locking remains an open issue.
11. Use one persistent worker.
12. Use Convex for durable state, locks, outbox, and idempotency.
13. Treat rich interactions and media as optional until live verified.

---

# Appendix B — Source index

## Official buildathon

- https://caspian.devpost.com/
- https://caspian.devpost.com/rules
- https://caspian.devpost.com/project-gallery
- https://caspian.devpost.com/participants
- https://caspian.devpost.com/resources
- https://caspian.devpost.com/updates

## Caspian official

- https://github.com/TryCaspian/caspian-sdk
- https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/README.md
- https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/sdks/typescript/src/client.ts
- https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/sdks/typescript/README.md
- https://github.com/TryCaspian/caspian-sdk/blob/f985ad0f7933321ed82c5d13f0222f6d81bfe228/examples/README.md
- https://github.com/TryCaspian/caspian-sdk/issues/82
- https://github.com/TryCaspian/caspian-sdk/issues/83
- https://github.com/TryCaspian/caspian-sdk/issues/118
- https://api.trycaspianai.com/SKILL.md
- https://www.trycaspianai.com/docs/

## Current public Caspian projects

- https://github.com/ritz541/pgops
- https://github.com/17AnuragMishra/inbox2interview
- https://github.com/Hardik180704/github-maintainer-agent
- https://github.com/Dragon-Emperor-core/caspian-ai-support-agent
- https://github.com/praju120056/Meridian
- https://github.com/Nighthawk1704/checkpoint

## Crisis/tabletop prior art

- https://kautiq.com/
- https://www.crisisplay.com/
- https://www.crisisttx.com/
- https://www.drillsforge.com/
- https://scenx.ai/
- https://www.gov.uk/government/publications/exercising-best-practice-guidance/exercising-best-practice-guidance-html

## Comparable hackathon evidence

- https://ai-agents-hackathon.devpost.com/project-gallery
- https://devpost.com/software/intellisupply
- https://devpost.com/software/focusiq

## Gemini

- https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- https://ai.google.dev/gemini-api/docs/rate-limits
