import type { CommClient } from "caspian-sdk";
import { handleInboundMessage } from "./handleInboundMessage";
import type { AgentState } from "./state";
import type { GeminiDecisionClassifier } from "@signal-fracture/ai";

export function registerSharedHandler(
  client: CommClient,
  state: AgentState,
  classifier: GeminiDecisionClassifier,
): void {
  client.onMessage(async (message) => {
    await handleInboundMessage(message, state, classifier);
  });
}
