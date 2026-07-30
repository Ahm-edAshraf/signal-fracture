import { z } from "zod";

const optionalNonempty = z.string().min(1).optional();

const envSchema = z.object({
  CASPIAN_API_KEY: z.string().min(1),
  CASPIAN_BASE_URL: z.url().default("https://api.trycaspianai.com"),
  CASPIAN_EMAIL_USERNAME: optionalNonempty,
  TELEGRAM_BOT_TOKEN: optionalNonempty,
  DISCORD_BOT_TOKEN: optionalNonempty,
  CONVEX_URL: z.url(),
  OPERATOR_SECRET: z.string().min(16),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_PRIMARY_MODEL: z.string().min(1),
  GEMINI_FALLBACK_MODEL: z.string().min(1),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(100).default(12_000),
  DECISION_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.82),
  CASPIAN_POLL_INTERVAL_MS: z.coerce.number().int().min(100).default(750),
  CASPIAN_MAX_BACKOFF_MS: z.coerce.number().int().min(1000).default(30_000),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  AGENT_HEALTH_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
});

export type AgentEnvironment = z.infer<typeof envSchema>;

export function readAgentEnvironment(
  source: Record<string, string | undefined> = process.env,
): AgentEnvironment {
  return envSchema.parse({
    ...source,
    AGENT_HEALTH_PORT: source.AGENT_HEALTH_PORT ?? source.PORT,
  });
}
