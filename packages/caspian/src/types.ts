import type { Message } from "caspian-sdk";

export type SupportedChannel = "email" | "telegram" | "discord";

export type InboundEnvelope = {
  eventId: string;
  messageId: string;
  conversationId: string;
  connectionId: string;
  channel: string;
  senderFingerprint: string;
  subject: string | null;
  text: string;
  mediaCount: number;
  receivedAt: number;
};

export type InboundMessage = {
  envelope: InboundEnvelope;
  reply: Message["reply"];
};

export type ConnectedChannel = {
  channel: SupportedChannel;
  connectionId: string;
  status: string;
};
