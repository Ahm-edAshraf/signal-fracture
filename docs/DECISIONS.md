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
