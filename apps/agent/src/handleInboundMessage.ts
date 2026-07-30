import {
  conversationHash,
  normalizeCaspianMessage,
} from "@signal-fracture/caspian";
import { participantMessage } from "@signal-fracture/shared";
import type { Message } from "caspian-sdk";
import type { AgentState } from "./state";
import { stripEmailQuotedReply } from "./emailQuoteStripper";
import { parseParticipantCommand } from "./commandRouter";
import { hashRoleCode, verifyRoleCode } from "./roleCodes";
import type {
  GeminiDecisionClassifier,
  GeminiReportNarrator,
} from "@signal-fracture/ai";
import {
  parseDeterministicDecision,
  type DecisionKey,
} from "@signal-fracture/core";
import type { Id } from "../../../convex/_generated/dataModel";

const ALL_DECISIONS: readonly DecisionKey[] = [
  "SEAL_BAY_3",
  "INSPECT",
  "WAIT",
  "ROUTE_BAY_3",
  "ROUTE_BAY_5",
  "NOTIFY_COMMANDER",
  "WAIT_FOR_CONFIRMATION",
  "PASSAGE_BLOCKED",
  "PASSAGE_AVAILABLE",
  "REROUTE_BAY_5",
  "REQUEST_OVERRIDE",
  "ESCALATE_NOW",
  "HOLD",
];

function redactedText(text: string): string {
  return `[redacted participant text; length=${text.length}]`;
}

function statusText(
  status: Awaited<ReturnType<AgentState["statusForConversation"]>>,
): string {
  if (status === null) {
    return "This conversation is not joined to a role. Use JOIN ASTERIA <ROLE> <CODE>.";
  }
  const facts = status.knownFacts
    .map(
      ({ factKey, observedValue, stale }) =>
        `- ${factKey}: ${JSON.stringify(observedValue)}${stale ? " (stale)" : ""}`,
    )
    .join("\n");
  return [
    `Role: ${status.roleKey.toUpperCase()} (${status.publicAlias})`,
    `Session: ${status.sessionStatus.toUpperCase()}`,
    "Facts known to your role:",
    facts || "- None",
  ].join("\n");
}

export async function handleInboundMessage(
  message: Message,
  state: AgentState,
  classifier: GeminiDecisionClassifier,
  narrator: GeminiReportNarrator,
): Promise<void> {
  const envelope = normalizeCaspianMessage(message);
  if (envelope.channel === "email") {
    envelope.text = stripEmailQuotedReply(envelope.text);
  }
  const claim = await state.claimInbound({
    ...envelope,
    senderFingerprint: envelope.senderFingerprint,
  });

  if (claim.duplicate || claim.rateLimited) return;

  const command = parseParticipantCommand(envelope.text);
  let body: string;
  let outcome = "message.received";
  let completedSessionId: Id<"sessions"> | undefined;

  if (command?.type === "help") {
    body = [
      "Commands:",
      "JOIN ASTERIA <FIELD|CONTROL|DIRECTOR> <CODE>",
      "STATUS",
      "ABORT",
      "LEAVE",
      "Decision choices shown in your active prompt",
    ].join("\n");
    outcome = "command.help";
  } else if (command?.type === "status") {
    body = statusText(
      await state.statusForConversation(envelope.conversationId),
    );
    outcome = "command.status";
  } else if (command?.type === "abort") {
    const result = await state.abortByConversation(envelope.conversationId);
    body = result.aborted
      ? "The fictional exercise is aborted. Pending injects have been cancelled."
      : "No active joined exercise was found for this conversation.";
    outcome = "command.abort";
  } else if (command?.type === "join") {
    const secret = process.env.OPERATOR_SECRET;
    if (secret === undefined) throw new Error("Operator secret is unavailable");
    const payload = verifyRoleCode(command.code, secret);
    if (payload === null || payload.role !== command.role) {
      body =
        "That role code is invalid, expired, or belongs to a different role.";
      outcome = "command.join_rejected";
    } else {
      try {
        const result = await state.joinRole({
          roleKey: command.role,
          joinCodeHash: hashRoleCode(command.code),
          conversationId: envelope.conversationId,
          connectionId: envelope.connectionId,
          channel: envelope.channel,
          senderFingerprint: envelope.senderFingerprint,
        });
        body = `Joined ASTERIA as ${command.role.toUpperCase()}. Send STATUS to see only the facts known to your role.`;
        outcome = `command.join_${result.status}`;
      } catch {
        body =
          "The role could not be joined. Check that the code is current, unused, and sent from the assigned channel.";
        outcome = "command.join_rejected";
      }
    }
  } else if (command?.type === "leave") {
    body =
      "LEAVE is recognized, but this demo keeps the role binding until the operator resets the fictional session. Use ABORT to stop an active drill.";
    outcome = "command.leave";
  } else {
    const prompt = await state.activePrompt(envelope.conversationId);
    if (prompt === null) {
      body =
        "Signal Fracture received your message through the shared channel handler. Reply HELP for commands or JOIN ASTERIA <ROLE> <CODE> to enter the drill.";
    } else if (prompt.status !== "open") {
      body =
        "Your next fictional inject is still being delivered. No decision was recorded.";
      outcome = "decision.not_open";
    } else {
      const allowed = prompt.allowedDecisions.filter(
        (decision): decision is DecisionKey =>
          ALL_DECISIONS.includes(decision as DecisionKey),
      );
      const deterministic = parseDeterministicDecision(envelope.text, allowed);
      const anyKnownDecision = parseDeterministicDecision(
        envelope.text,
        ALL_DECISIONS,
      );
      if (deterministic !== null) {
        const result = await state.acceptDecision({
          inboundEventId: envelope.messageId,
          conversationId: envelope.conversationId,
          injectId: prompt.injectId,
          expectedInjectVersion: prompt.version,
          canonicalDecision: deterministic.decision,
          parseMethod: deterministic.method,
          rawTextRedacted: redactedText(envelope.text),
        });
        body =
          result.outcome === "applied"
            ? `Decision recorded: ${deterministic.decision.replaceAll("_", " ")}.`
            : "That decision prompt is already closed. Send STATUS for your current role state.";
        outcome = `decision.${result.outcome}`;
        if (result.outcome === "applied" && result.sessionCompleted) {
          completedSessionId = result.sessionId;
        }
      } else if (anyKnownDecision !== null) {
        body = `That decision prompt is already closed. Your current valid choices are: ${allowed.join(", ")}.`;
        outcome = "decision.stale_choice";
      } else {
        const classification = await classifier.classify({
          participantText: envelope.text,
          allowedDecisions: allowed,
        });
        if (classification.status === "accepted") {
          const decision = classification.classification
            .decision as DecisionKey;
          const result = await state.acceptDecision({
            inboundEventId: envelope.messageId,
            conversationId: envelope.conversationId,
            injectId: prompt.injectId,
            expectedInjectVersion: prompt.version,
            canonicalDecision: decision,
            parseMethod: "gemini",
            confidence: classification.classification.confidence,
            rawTextRedacted: redactedText(envelope.text),
          });
          body =
            result.outcome === "applied"
              ? `Decision recorded: ${decision.replaceAll("_", " ")}.`
              : "That decision prompt is already closed. Send STATUS for your current role state.";
          outcome = `decision.${result.outcome}`;
          if (result.outcome === "applied" && result.sessionCompleted) {
            completedSessionId = result.sessionId;
          }
        } else {
          const clarification = await state.requestClarification({
            inboundEventId: envelope.messageId,
            conversationId: envelope.conversationId,
            injectId: prompt.injectId,
            expectedInjectVersion: prompt.version,
            rawTextRedacted: redactedText(envelope.text),
          });
          const showOptions =
            classification.status === "unavailable" ||
            clarification.showExplicitOptions;
          body =
            classification.status === "clarification" &&
            classification.reason === "unsafe"
              ? "This system only runs fictional communication drills and cannot assist with real emergency dispatch or real-world operations."
              : showOptions
                ? `I could not map that safely. Reply with one exact choice: ${allowed.join(", ")}.`
                : "I could not identify one unambiguous fictional decision. Please restate the action you choose.";
          outcome = `decision.${classification.status}`;
        }
      }
    }
  }

  await message.reply(participantMessage(body));
  const outcomeRef = `${outcome}:${conversationHash(envelope.conversationId).slice(0, 16)}`;
  await state.completeInbound(envelope.messageId, outcomeRef);
  if (completedSessionId !== undefined) {
    await state
      .generateReportNarrative(completedSessionId, narrator)
      .catch(() => false);
  }
}
