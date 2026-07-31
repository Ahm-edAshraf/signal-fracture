import type { CommClient } from "caspian-sdk";
import { handleInboundMessage } from "./handleInboundMessage";
import type { AgentState } from "./state";
import type {
  GeminiDecisionClassifier,
  GeminiReportNarrator,
} from "@signal-fracture/ai";
import {
  hasChannelCapability,
  type ChannelCapabilities,
  type ConnectedChannel,
} from "@signal-fracture/caspian";
import { handleInboundInteraction } from "./handleInboundInteraction";

export function registerSharedHandler(
  client: CommClient,
  state: AgentState,
  classifier: GeminiDecisionClassifier,
  narrator: GeminiReportNarrator,
  channelCapabilities: ChannelCapabilities,
  connectedChannels: readonly ConnectedChannel[],
): void {
  client.onMessage(async (message) => {
    await handleInboundMessage(
      message,
      state,
      classifier,
      narrator,
      channelCapabilities,
    );
  });
  if (
    connectedChannels.some(({ channel }) =>
      hasChannelCapability(channelCapabilities, channel, "interactions"),
    )
  ) {
    client.onInteraction(async (interaction) => {
      const channel =
        connectedChannels.find(
          ({ connectionId }) => connectionId === interaction.connectionId,
        )?.channel ?? "unknown";
      await handleInboundInteraction(interaction, channel, state, narrator);
    });
  }
}
