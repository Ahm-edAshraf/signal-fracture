# Manual actions

All required credentials and CLI authentications were available during the 31 July 2026 audit. No secret value was printed, logged, or committed.

## Later submission-only actions

- Confirm the official deadline and optional interaction-handler policy with organizers.
- Record two video takes after the live three-channel rehearsal is green.
- Submit the final Devpost entry after all evidence links are public.

## Pending canonical live rehearsal

1. Open <https://signal-fracture.vercel.app/operator> and authenticate with the already configured operator secret.
2. Select **Stage session**. The three single-use join commands appear once.
3. Privately copy each command to its assigned participant and have them send it through the shown real channel:
   - Field Engineer: Telegram
   - Mission Control: Discord
   - Operations Director: Email
4. Wait until all three role indicators read `joined`; then select **Start when joined**.
5. Send the canonical decisions through the assigned channels:
   - Field: `SEAL BAY 3`
   - Control: `ROUTE BAY 3`
   - Director: `WAIT FOR CONFIRMATION`
6. After the private reconciliation injects arrive, send:
   - Field: `PASSAGE BLOCKED`
   - Control: `REROUTE BAY 5`
   - Director: `ESCALATE NOW`
7. Keep <https://signal-fracture.vercel.app> visible and confirm the session completes with one resolved `C-BAY3` contradiction and an after-action report.
8. In the operator console, select **Export report** and privacy-review the downloaded JSON before using it as submission evidence.

The operator may use **Pause exercise** during a demonstration interruption and **Resume exercise** to restore the prior running or reconciliation phase without consuming participant response time. **Abort exercise** cancels the fictional run. A session paused because a required delivery exhausted its retries or a required response deadline elapsed cannot be resumed; use **Reset demo tenant** and stage a new run after correcting the problem.

The operator secret and temporary role commands must not be pasted into public chat, screenshots, logs, or repository files.

## Completed autonomously

- Authenticated Caspian channel discovery
- Named Email, Telegram, and Discord connection verification
- Convex project and dev deployment creation
- Convex production deployment
- Vercel production deployment for the qualification surface
- Railway persistent worker deployment and readiness verification
- Public live evidence dashboard and guarded operator console
- Real-browser critical dashboard and public-redaction checks
- Real Email inbound, same-thread reply, and proactive persisted-conversation send
- Real Telegram and Discord inbound, shared-handler reply, and proactive persisted-conversation sends
- GitHub, Vercel, and Railway CLI authentication availability checks
- Public GitHub repository creation after secret and participant-data review
