# Manual actions

All required credentials and CLI authentications were available during the 31 July 2026 audit. No secret value was printed, logged, or committed.

## Pending now

### Telegram inbound qualification

Status: participant message required

1. Open the already configured Signal Fracture Telegram bot.
2. Send `HELP` while the persistent worker is running.
3. Confirm the bot reply begins with the exercise banner.

No token or configuration change is needed.

### Discord inbound qualification

Status: participant message required

1. In the controlled Discord location where the configured bot is installed, send `HELP` in a location the bot can read.
2. Confirm the bot reply begins with the exercise banner.

No token or configuration change is needed. If no inbound event appears, verify Message Content Intent and channel permissions in the existing Discord application.

## Later submission-only actions

- Confirm the official deadline and optional interaction-handler policy with organizers.
- Record two video takes after the live three-channel rehearsal is green.
- Publish the repository only after the secret and participant-data review.
- Submit the final Devpost entry after all evidence links are public.

## Completed autonomously

- Authenticated Caspian channel discovery
- Named Email, Telegram, and Discord connection verification
- Convex project and dev deployment creation
- Real Email inbound, same-thread reply, and proactive persisted-conversation send
- GitHub, Vercel, and Railway CLI authentication availability checks
