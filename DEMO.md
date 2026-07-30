# DEMO.md — Winning Demo

## Goal

The judge should understand the novelty in 20 seconds:

> Three people receive three different truths. Their locally reasonable decisions conflict. One Caspian agent exposes the fracture.

## Windows

Show:

1. Telegram — Field
2. Discord — Control
3. Email — Director
4. Signal Fracture dashboard
5. Optional narrow sanitized log

## Exact demo script

### 0:00–0:15 — hook

Show three online channel indicators and one empty causal graph.

Say:

> Infrastructure teams chaos-test servers. Signal Fracture chaos-tests the information humans receive.

### 0:15–0:30 — roles join

Show role bindings already ready or perform quickly:

```text
JOIN ASTERIA FIELD <code>
JOIN ASTERIA CONTROL <code>
JOIN ASTERIA DIRECTOR <code>
```

Do not spend time explaining account setup.

### 0:30–0:50 — Field

Telegram receives:

> EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY  
> Pressure is rising in Bay 3. Choose: SEAL BAY 3, INSPECT, or WAIT.

Reply:

```text
SEAL BAY 3
```

Dashboard:

- world Bay 3 = SEALED;
- Field knows;
- Control/Director do not.

### 0:50–1:10 — Control

Discord receives stale state:

> Last synchronized map shows Bay 3 passable. Crew 7 needs the shortest route. Choose ROUTE BAY 3 or ROUTE BAY 5.

Reply:

```text
ROUTE BAY 3
```

### 1:10–1:25 — unforgettable reveal

Dashboard draws red edge:

```text
BAY 3 SEALED
conflicts with
CREW 7 ROUTED THROUGH BAY 3
```

Say:

> Both choices were rational from each person's local view. The communication graph was wrong.

### 1:25–1:40 — Director

Email receives the escalation decision and replies:

```text
WAIT FOR CONFIRMATION
```

Show divergence worsening.

### 1:40–2:05 — reconciliation

Real messages arrive:

- Telegram asks Field to confirm blockage.
- Discord asks Control to reroute.
- Email asks Director to escalate.

Responses:

```text
PASSAGE BLOCKED
REROUTE BAY 5
ESCALATE NOW
```

Dashboard changes to RESOLVED.

### 2:05–2:30 — after-action report

Show:

# WHO KNEW WHAT, WHEN?

- Field knew at T+…
- Control acted at T+…
- Director delayed at T+…
- contradiction detected at T+…
- reconciled at T+…

Show channel latency and zero duplicate transitions.

### 2:30–2:50 — Caspian proof

Open exact shared handler source and show:

- one `onMessage`;
- three channel connections;
- real event IDs.

Say:

> Caspian is not a notification layer here. It is the shared nervous system of the exercise.

### 2:50–3:00 — close

> Signal Fracture turns fragmented channels into a measurable coordination test.

Adjust to the current official time limit.

## Must be real

- channel sends;
- replies;
- graph updates;
- contradiction;
- reconciliation;
- event IDs.

No edited fake success.

## Live judge questions

### Is this a tabletop simulator?

> Existing tabletop tools usually centralize participants in one portal. Signal Fracture makes the fragmented communication environment itself the test surface and maintains separate knowledge state per role.

### Why Caspian?

> Each role has a private real conversation on a different platform. One Caspian handler maintains one causal world and proactively changes what each role receives.

### Is AI making emergency decisions?

> No. The scenario is fictional. Participants decide. Gemini only classifies wording into a fixed choice. All facts, transitions, contradictions, and metrics are deterministic.

### Could this be three Slack channels?

> That would remove heterogeneous channel timing, threading, format, and attention behavior—the variable being tested.

### What if a channel fails?

> The branch pauses, the dashboard shows degraded delivery, and the system never pretends the role received the inject.

### What if a duplicate event arrives?

> Caspian IDs are atomically deduplicated in Convex, and every outbound effect has a stable key.

## Backup plans

### Discord unavailable

Use two channels and three separate conversations. Disclose the fallback.

### Gemini unavailable

Use exact commands. Natural replies get explicit choices.

### Dashboard unavailable

Use real channel sequence plus a sanitized CLI timeline.

### Email spam

Warm the mailbox, show spam folder, preserve event evidence.

## Rehearsal checklist

- [ ] demo tenant reset
- [ ] all channels active
- [ ] no stale role bindings
- [ ] exact choices ready
- [ ] quota checked
- [ ] worker warm
- [ ] notifications disabled
- [ ] secrets hidden
- [ ] backup network
- [ ] backup recording
- [ ] ten successful runs
