# Architecture decisions

## ADR-001 — Signal Fracture over RelayLoop

Status: accepted

Signal Fracture makes heterogeneous communication and asymmetric knowledge central to the product. Earlier RelayLoop and translation-bridge concepts are withdrawn.

## ADR-002 — Persistent single worker

Status: accepted

The installed `caspian-sdk` 0.6.1 exposes `dispatchPending(afterSeq)`. The worker persists the returned sequence in Convex, accepts replay after a crash, and runs exactly one active instance.

## ADR-003 — Convex as system of record

Status: accepted

Convex stores the checkpoint, inbound claims, conversation contacts, role endpoints, facts, knowledge, injects, decisions, contradictions, deliveries, audit events, and reports. Critical correctness does not depend on process memory.

## ADR-004 — Text-first interactions

Status: accepted

Every judged action is available as text. Authenticated capabilities may enable blocks, buttons, reactions, and media, but those affordances are optional and cannot remove or change the text decision path.

## ADR-005 — Deterministic scenario engine

Status: accepted

Code owns facts, visibility, transitions, contradictions, completion, retry, and metrics. Gemini can only classify participant wording into an active fixed allowlist or request clarification.

## ADR-006 — Gateway bootstrap checkpoint

Status: accepted

When no checkpoint exists, the worker records the current highest gateway sequence before listening. This avoids replying to historical pre-installation traffic. Every subsequent poll dispatches from the persisted sequence and relies on atomic inbound deduplication for crash-window replay.

## ADR-007 — Provider send is `sent`, not falsely `delivered`

Status: accepted

A successful `sendMessage` call records a `sent` delivery plus provider evidence and latency. The implementation does not invent read receipts or claim a participant acknowledged the message.

## ADR-008 — Deterministic report before optional narration

Status: accepted

Scenario completion writes the metrics, causal timeline, and deterministic summary atomically before any model call. The worker may ask Gemini to turn only that frozen evidence into concise prose. Invalid output or a total model outage leaves the authoritative deterministic report available and does not roll back completion.

## ADR-009 — Public-safe evidence plane and server-only operator authority

Status: accepted

The public dashboard reads a dedicated Convex projection containing only public aliases, synthetic scenario facts, canonical decisions, delivery metadata, truncated event references, and aggregate reliability values. Addressing fields never enter the response. Operator mutations pass through server-side Next.js routes authenticated by a short-lived HttpOnly/SameSite cookie; the Convex operator secret is never shipped to browser code.

## ADR-010 — Provider acknowledgement ambiguity is explicit

Status: accepted

After Caspian accepts an outbound send, the worker retries only the Convex acknowledgement and does not call `sendMessage` again for a transient persistence error. This prevents avoidable duplicates while the process remains alive. A hard crash after provider acceptance but before the acknowledgement is durably stored remains an unavoidable ambiguity because the installed SDK does not expose an outbound idempotency key. Recovery may resend that logical delivery; the dashboard and audit log retain the stable logical effect key and attempt history, and the project does not claim exactly-once provider delivery.

## ADR-011 — Pause reason controls resumability

Status: accepted

An operator pause preserves whether the session was running or reconciling, freezes open response deadlines, holds pending outbox claims, and rejects participant decisions without applying them. Resume restores that preserved phase and shifts deadlines by the measured pause duration. A pause caused by a permanently failed required delivery or a missed safety deadline is intentionally not resumable from the console; the operator must correct the problem and reset the demo tenant. This prevents a control-plane action from bypassing a required invariant.

## ADR-012 — Deadlines advance only the intended demo timeout

Status: accepted

Response windows begin only after the provider accepts the inject send. F1 has a 120-second window and may advance to C1 on expiry because the scenario specification explicitly allows that demo timeout. C1, RF1, and RC1 use 120 seconds; D1 and RD1 use 180 seconds. Any non-F1 miss expires the inject, records deterministic audit evidence, and pauses the session for reset. This avoids inventing a participant decision while keeping the documented demonstration graph executable.

## ADR-013 — Coordination scoring is deterministic and inspectable

Status: accepted

The score starts at 100 and subtracts 10 per contradiction, 25 per unresolved contradiction, 2 per retry up to 10, 20 per failed delivery, and 2 per completed 30 seconds of contradiction-resolution time up to 20. The result is clamped to 0–100. No model output affects the score.

## ADR-014 — Participant replies confirm role knowledge

Status: accepted

Caspian provider acceptance is stored as `sent`; it is not presented as a read receipt. Runtime role-knowledge records for an inject are therefore created when that participant replies to the active inject, proving they received its contents no later than that timestamp. Repeated clarification or acknowledgement retries do not duplicate knowledge. This keeps the who-knew-what-when report conservative.

## ADR-015 — Claimed inbound events are recoverable work

Status: accepted

A replay of a fully processed inbound event is a duplicate and stops before business logic. A replay whose durable record is still `claimed` or `failed` resumes processing instead. This closes the crash window between atomic claim and completion for the single-worker deployment while expected versions and stable effect keys continue to prevent repeated decisions and transitions.

## ADR-016 — Optional SDK capabilities are runtime-gated

Status: accepted

The worker reads the authenticated capability catalog after connecting channels. Rich blocks are presentation-only; buttons, reactions, and media are passed only when their capability is advertised. Button decisions use the same atomic inbound claim and deterministic acceptance mutation as text. Text remains the only qualification-critical and rehearsal-required path until optional affordances are live-verified.

## ADR-017 — Every allowed decision branch terminates

Status: accepted

The three initial prompts can complete safely without a contradiction. A detected contradiction opens all three reconciliation prompts after the Director answers. The exact safe trio resolves and completes; any fully answered unsafe trio fails explicitly. Finalization closes answered injects, cancels unused planned injects, clears role pointers, freezes a deterministic report, and leaves no hidden active state.
