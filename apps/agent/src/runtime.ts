import {
  connectConfiguredChannels,
  createCaspianClient,
  parseChannelCapabilities,
} from "@signal-fracture/caspian";
import { readAgentEnvironment } from "./env";
import { registerSharedHandler } from "./registerSharedHandler";
import { AgentState } from "./state";
import {
  GeminiDecisionClassifier,
  GeminiReportNarrator,
} from "@signal-fracture/ai";

export async function createAgentRuntime() {
  const env = readAgentEnvironment();
  const client = createCaspianClient({
    apiKey: env.CASPIAN_API_KEY,
    baseUrl: env.CASPIAN_BASE_URL,
    ...(env.CASPIAN_EMAIL_USERNAME === undefined
      ? {}
      : { emailUsername: env.CASPIAN_EMAIL_USERNAME }),
    ...(env.TELEGRAM_BOT_TOKEN === undefined
      ? {}
      : { telegramBotToken: env.TELEGRAM_BOT_TOKEN }),
    ...(env.DISCORD_BOT_TOKEN === undefined
      ? {}
      : { discordBotToken: env.DISCORD_BOT_TOKEN }),
  });
  const state = new AgentState(env.CONVEX_URL, env.OPERATOR_SECRET);
  const classifier = new GeminiDecisionClassifier({
    apiKey: env.GEMINI_API_KEY,
    primaryModel: env.GEMINI_PRIMARY_MODEL,
    fallbackModel: env.GEMINI_FALLBACK_MODEL,
    confidenceThreshold: env.DECISION_CONFIDENCE_THRESHOLD,
    timeoutMs: env.GEMINI_TIMEOUT_MS,
  });
  const narrator = new GeminiReportNarrator({
    apiKey: env.GEMINI_API_KEY,
    primaryModel: env.GEMINI_PRIMARY_MODEL,
    fallbackModel: env.GEMINI_FALLBACK_MODEL,
    timeoutMs: env.GEMINI_TIMEOUT_MS,
  });
  const channels = await connectConfiguredChannels(client, {
    apiKey: env.CASPIAN_API_KEY,
    baseUrl: env.CASPIAN_BASE_URL,
    ...(env.CASPIAN_EMAIL_USERNAME === undefined
      ? {}
      : { emailUsername: env.CASPIAN_EMAIL_USERNAME }),
    ...(env.TELEGRAM_BOT_TOKEN === undefined
      ? {}
      : { telegramBotToken: env.TELEGRAM_BOT_TOKEN }),
    ...(env.DISCORD_BOT_TOKEN === undefined
      ? {}
      : { discordBotToken: env.DISCORD_BOT_TOKEN }),
  });
  const channelCapabilities = await client
    .channels()
    .then(parseChannelCapabilities)
    .catch(() => new Map<string, Set<string>>());
  await state.recordChannelHealth(channels).catch(() => undefined);
  registerSharedHandler(
    client,
    state,
    classifier,
    narrator,
    channelCapabilities,
    channels,
  );
  return {
    channelCapabilities,
    channels,
    classifier,
    client,
    env,
    narrator,
    state,
  };
}
