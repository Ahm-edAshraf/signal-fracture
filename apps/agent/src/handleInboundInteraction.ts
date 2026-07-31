import type { Interaction } from "caspian-sdk";
import { fingerprint } from "@signal-fracture/caspian";
import { participantMessage } from "@signal-fracture/shared";
import type { DecisionKey } from "@signal-fracture/core";
import type { GeminiReportNarrator } from "@signal-fracture/ai";
import type { AgentState } from "./state";

type InteractionState = Pick<
  AgentState,
  | "acceptDecision"
  | "activePrompt"
  | "claimInbound"
  | "completeInbound"
  | "generateReportNarrative"
>;

function interactionEventId(interaction: Interaction): string {
  const sourceId =
    typeof interaction.sourceMessage?.id === "string"
      ? interaction.sourceMessage.id
      : fingerprint(interaction.sourceMessage);
  return `interaction:${fingerprint({
    connectionId: interaction.connectionId,
    conversationId: interaction.conversationId,
    sourceId,
    value: interaction.value,
    sender: fingerprint(interaction.sender),
  })}`;
}

export async function handleInboundInteraction(
  interaction: Interaction,
  channel: string,
  state: InteractionState,
  narrator: GeminiReportNarrator,
): Promise<void> {
  const conversationId = interaction.conversationId;
  const inboundEventId = interactionEventId(interaction);
  const selected = interaction.value?.startsWith("decision:")
    ? interaction.value.slice("decision:".length)
    : null;
  if (conversationId === null || selected === null) {
    await interaction.reply(
      participantMessage(
        "That interaction is not an active fictional decision. Reply with the text choice shown in the latest inject.",
      ),
    );
    return;
  }
  const claim = await state.claimInbound({
    eventId: inboundEventId,
    messageId: inboundEventId,
    conversationId,
    connectionId: interaction.connectionId,
    channel,
    senderFingerprint: fingerprint(interaction.sender),
    subject: null,
    text: selected,
    mediaCount: 0,
    receivedAt: Date.now(),
  });
  if (claim.duplicate || claim.rateLimited) return;

  const finish = async (outcome: string): Promise<void> => {
    await state.completeInbound(inboundEventId, outcome);
  };
  const prompt = await state.activePrompt(conversationId);
  if (prompt === null) {
    await interaction.reply(
      participantMessage(
        "This conversation has no active fictional decision. Send STATUS for the current role state.",
      ),
    );
    await finish("interaction.no_active_prompt");
    return;
  }
  if (prompt.sessionStatus === "paused") {
    await interaction.reply(
      participantMessage(
        "The fictional exercise is paused. No button decision was recorded; use the latest text prompt after the operator resolves the pause.",
      ),
    );
    await finish("interaction.session_paused");
    return;
  }
  if (prompt.status !== "open" || !prompt.allowedDecisions.includes(selected)) {
    await interaction.reply(
      participantMessage(
        `That button is stale. Current valid text choices: ${prompt.allowedDecisions.join(", ")}.`,
      ),
    );
    await finish("interaction.stale_choice");
    return;
  }

  const decision = selected as DecisionKey;
  const result = await state.acceptDecision({
    inboundEventId,
    conversationId,
    injectId: prompt.injectId,
    expectedInjectVersion: prompt.version,
    canonicalDecision: decision,
    parseMethod: "command",
    rawTextRedacted: "[redacted button interaction]",
  });
  await interaction.reply(
    participantMessage(
      result.outcome === "applied"
        ? `Decision recorded: ${decision.replaceAll("_", " ")}.`
        : "That decision was already processed. Send STATUS for the current role state.",
    ),
  );
  await finish(`interaction.decision_${result.outcome}`);
  if (result.outcome === "applied" && result.sessionFinalized) {
    await state
      .generateReportNarrative(result.sessionId, narrator)
      .catch(() => false);
  }
}
