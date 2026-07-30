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

Every judged action is available as text. Blocks, buttons, reactions, and media remain optional until real channel tests justify them.

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
