# Signal Fracture architecture

```mermaid
flowchart LR
  F[Field Engineer<br/>Telegram] --> C[Caspian gateway]
  M[Mission Control<br/>Discord] --> C
  D[Operations Director<br/>Email] --> C
  C --> H[One shared onMessage handler]
  H --> I[Atomic inbound claim]
  I --> P[Commands / constrained decision parsing]
  P --> V[(Convex system of record)]
  V --> E[Deterministic scenario + contradiction engine]
  E --> O[Atomic outbox]
  O --> C
  V --> W[Evidence dashboard + after-action report]
```

The worker uses a persisted Caspian sequence and `dispatchPending(savedSeq)`. A crash after dispatch but before checkpoint persistence can replay an event; Convex message-ID uniqueness and stable delivery keys suppress repeated consequences.

Global facts and each role's knowledge are separate tables. The public dashboard receives aliases and redacted evidence, never participant addresses or raw private messages.

The browser polls a server-side Next.js route that queries a deliberately public-safe Convex projection. Operator actions use a separate route: the configured secret is validated only on the server, exchanged for a short-lived HttpOnly/SameSite cookie, and never bundled into client JavaScript. Session creation returns single-use role commands once; Convex stores only their hashes.
