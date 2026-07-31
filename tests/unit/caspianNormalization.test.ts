import {
  conversationHash,
  fingerprint,
  normalizeCaspianMessage,
} from "../../packages/caspian/src";
import { describe, expect, it } from "vitest";

describe("Caspian inbound normalization", () => {
  it("preserves routing evidence while hashing sender identity", () => {
    const envelope = normalizeCaspianMessage(
      {
        id: "message-123",
        conversationId: "conversation-456",
        connectionId: "connection-789",
        channel: "TeLeGrAm",
        sender: { username: "private-participant", numericId: 42 },
        subject: null,
        text: null,
      },
      1_234,
    );

    expect(envelope).toEqual({
      eventId: "message-123",
      messageId: "message-123",
      conversationId: "conversation-456",
      connectionId: "connection-789",
      channel: "telegram",
      senderFingerprint: fingerprint({
        username: "private-participant",
        numericId: 42,
      }),
      subject: null,
      text: "",
      receivedAt: 1_234,
    });
    expect(envelope.senderFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(envelope)).not.toContain("private-participant");
  });

  it("produces stable hashes independent of object key order", () => {
    expect(fingerprint({ channel: "email", id: 7 })).toBe(
      fingerprint({ id: 7, channel: "email" }),
    );
    expect(conversationHash("private-conversation")).toBe(
      conversationHash("private-conversation"),
    );
    expect(conversationHash("private-conversation")).not.toContain(
      "private-conversation",
    );
  });
});
