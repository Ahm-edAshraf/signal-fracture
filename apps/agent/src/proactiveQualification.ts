import { createCaspianClient } from "@signal-fracture/caspian";
import { participantMessage } from "@signal-fracture/shared";
import { readAgentEnvironment } from "./env";
import { AgentState } from "./state";

const requested = process.argv[2];
if (!(["email", "telegram", "discord"] as const).some((x) => x === requested)) {
  throw new Error("Usage: qualify:proactive <email|telegram|discord>");
}
if (
  process.env.ENABLE_LIVE_TESTS !== "true" ||
  process.env.ENABLE_LIVE_SENDS !== "true"
) {
  throw new Error(
    "Proactive live sends require ENABLE_LIVE_TESTS=true and ENABLE_LIVE_SENDS=true",
  );
}

const channel = requested as "email" | "telegram" | "discord";
const env = readAgentEnvironment();
const state = new AgentState(env.CONVEX_URL, env.OPERATOR_SECRET);
const contact = await state.latestContact(channel);
if (contact === null) {
  throw new Error(`No persisted ${channel} conversation is available`);
}
const client = createCaspianClient({
  apiKey: env.CASPIAN_API_KEY,
  baseUrl: env.CASPIAN_BASE_URL,
});
await client.sendMessage(
  contact.conversationId,
  participantMessage(
    "Proactive qualification inject delivered to this persisted conversation.",
  ),
);
console.info(
  JSON.stringify({
    event: "proactive_qualification_sent",
    channel,
    providerAccepted: true,
  }),
);
