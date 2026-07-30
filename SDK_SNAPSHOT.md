# SDK_SNAPSHOT.md

The research used the user-provided Caspian source archive.

- Archive: `caspian-sdk-main.zip`
- SHA-256: `57202d1823b88f6119e0b386c31bda1c8716354fe5a6c2d5856bdefc0f0732b8`
- Embedded Git commit: `f985ad0f7933321ed82c5d13f0222f6d81bfe228`
- TypeScript npm package version: `0.6.1`
- Snapshot date: 30 July 2026

Confirmed source APIs include:

- `onMessage`
- `reply`
- `sendMessage`
- `dispatchPending`
- `events`
- `channels`
- `listConversations`
- `listMessages`
- `onInteraction`
- `onReaction`
- media and rich blocks
- per-conversation queue/debounce strategies

Source presence is not proof that the hosted gateway enables every capability for the user's project. Real authenticated channel discovery and smoke tests remain mandatory.
