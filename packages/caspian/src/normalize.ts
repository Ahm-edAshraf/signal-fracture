import { createHash } from "node:crypto";
import type { Message } from "caspian-sdk";
import type { InboundEnvelope } from "./types";

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

export function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function normalizeCaspianMessage(
  message: Message,
  receivedAt = Date.now(),
): InboundEnvelope {
  return {
    eventId: message.id,
    messageId: message.id,
    conversationId: message.conversationId,
    connectionId: message.connectionId,
    channel: message.channel.toLowerCase(),
    senderFingerprint: fingerprint(message.sender),
    subject: message.subject,
    text: message.text ?? "",
    receivedAt,
  };
}

export function conversationHash(conversationId: string): string {
  return fingerprint(conversationId);
}
