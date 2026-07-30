# ENVIRONMENT.md

## Required variables

```bash
# Caspian
CASPIAN_API_KEY=
CASPIAN_BASE_URL=https://api.trycaspianai.com
CASPIAN_EMAIL_USERNAME=signal-fracture
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=

# Convex
CONVEX_DEPLOYMENT=
CONVEX_URL=
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=

# Gemini
GEMINI_API_KEY=
GEMINI_PRIMARY_MODEL=
GEMINI_FALLBACK_MODEL=
GEMINI_TIMEOUT_MS=12000
GEMINI_MAX_RETRIES=1

# App
NODE_ENV=development
DEMO_TENANT_ID=signal-fracture-demo
OPERATOR_SECRET=
AGENT_HEALTH_PORT=3001
LOG_LEVEL=info
ENABLE_LIVE_SENDS=false
ENABLE_LIVE_TESTS=false
CASPIAN_POLL_INTERVAL_MS=750
CASPIAN_MAX_BACKOFF_MS=30000
OUTBOX_MAX_ATTEMPTS=3
DECISION_CONFIDENCE_THRESHOLD=0.82
ROLE_CODE_TTL_MINUTES=60
```

## SDK snapshot

Research snapshot:

- commit `f985ad0f7933321ed82c5d13f0222f6d81bfe228`
- npm version `0.6.1`

Install:

```bash
bun add caspian-sdk@0.6.1
```

Then inspect the installed `.d.ts` files.

## Channel discovery

```bash
curl -fsS \
  "$CASPIAN_BASE_URL/v1/channels" \
  -H "Authorization: Bearer $CASPIAN_API_KEY"
```

Save a redacted copy in live evidence.

## Email

Source-confirmed TypeScript call:

```ts
await client.connectEmail({
  username: process.env.CASPIAN_EMAIL_USERNAME,
});
```

Verify actual returned address.

## Telegram

Human action:

1. Message `@BotFather`.
2. `/newbot`
3. Save token in `TELEGRAM_BOT_TOKEN`.

Source-confirmed call:

```ts
await client.connectTelegram({
  botToken: env.TELEGRAM_BOT_TOKEN,
});
```

## Discord

Human action:

1. Create Discord application.
2. Create bot.
3. Enable required message-content intent if live guide requires it.
4. Invite to controlled server or use DM flow.
5. Store token.

Source-confirmed call:

```ts
await client.connectDiscord({
  botToken: env.DISCORD_BOT_TOKEN,
});
```

## Gemini

The dashboard showed generous limits for the Flash-Lite models, but display names may not equal API IDs.

Before coding:

- list available models using current official Google API;
- set exact IDs in environment;
- do not hardcode them in source.

## Convex

```bash
bunx convex dev
```

Use separate dev/demo production deployments when practical.

## Live-send guard

No automated test sends to real accounts unless both are true:

```bash
ENABLE_LIVE_TESTS=true
ENABLE_LIVE_SENDS=true
```

## Development commands

```bash
bun install
bunx convex dev
bun run dev:agent
bun run dev:web
```

## Deployment

Agent host must:

- run continuously;
- restart automatically;
- support secrets;
- expose logs;
- not suspend;
- use one replica.

Web may run on Vercel.

## Secret rules

- commit only `.env.example`;
- no tokens in screenshots;
- no secrets in browser variables;
- rotate exposed credentials;
- run secret scanner before public release.
