import { describe, expect, it, vi } from "vitest";
import type { CommClient, Interaction } from "caspian-sdk";
import type {
  GeminiDecisionClassifier,
  GeminiReportNarrator,
} from "@signal-fracture/ai";
import {
  hasChannelCapability,
  parseChannelCapabilities,
} from "../../packages/caspian/src";
import { capabilityGatedPayload } from "../../apps/agent/src/presentation";
import { handleInboundInteraction } from "../../apps/agent/src/handleInboundInteraction";
import { registerSharedHandler } from "../../apps/agent/src/registerSharedHandler";
import type { AgentState } from "../../apps/agent/src/state";

const catalog = parseChannelCapabilities([
  {
    channel: "telegram",
    capabilities: ["interactions", "media", "reactions"],
  },
  { channel: "discord", capabilities: ["interactions", "media"] },
  { channel: "email", capabilities: ["media"] },
  { type: "email", capabilities: ["reply"] },
  { channel: 42, capabilities: "not-an-array" },
]);

describe("Caspian capability-aware presentation", () => {
  it("parses only public capability names", () => {
    expect(hasChannelCapability(catalog, "TELEGRAM", "interactions")).toBe(
      true,
    );
    expect(hasChannelCapability(catalog, "email", "interactions")).toBe(false);
    expect(hasChannelCapability(catalog, "email", "reply")).toBe(true);
    expect(catalog.has("42")).toBe(false);
  });

  it("keeps text everywhere and gates buttons and media", () => {
    const payload = {
      text: "EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY",
      blocks: [
        { type: "heading", text: "Asteria" },
        {
          type: "buttons",
          buttons: [{ label: "SEAL BAY 3", value: "decision:SEAL_BAY_3" }],
        },
      ],
      media: [{ url: "https://example.test/fictional-map.png" }],
    };
    const telegram = capabilityGatedPayload("telegram", payload, catalog);
    expect(telegram.text).toBe(payload.text);
    expect(telegram.blocks?.map(({ type }) => type)).toEqual([
      "heading",
      "buttons",
    ]);
    expect(telegram.media).toHaveLength(1);

    const email = capabilityGatedPayload("email", payload, catalog);
    expect(email.blocks?.map(({ type }) => type)).toEqual(["heading"]);
    expect(email.media).toHaveLength(1);

    const unsupported = capabilityGatedPayload("x", payload, catalog);
    expect(unsupported).toMatchObject({
      text: payload.text,
      blocks: null,
      media: null,
    });
  });
});

describe("Caspian optional interaction path", () => {
  it("applies a supported button value through the same decision mutation", async () => {
    const reply = vi.fn().mockResolvedValue({});
    const claimInbound = vi.fn().mockResolvedValue({
      duplicate: false,
      rateLimited: false,
    });
    const completeInbound = vi.fn().mockResolvedValue(undefined);
    const acceptDecision = vi.fn().mockResolvedValue({
      outcome: "applied",
      sessionFinalized: false,
    });
    const state = {
      activePrompt: vi.fn().mockResolvedValue({
        injectId: "inject-id",
        version: 2,
        status: "open",
        sessionStatus: "running",
        allowedDecisions: ["SEAL_BAY_3", "WAIT"],
      }),
      claimInbound,
      completeInbound,
      acceptDecision,
      generateReportNarrative: vi.fn(),
    };
    const interaction = {
      connectionId: "connection-id",
      conversationId: "conversation-id",
      value: "decision:SEAL_BAY_3",
      sourceMessage: { id: "source-message-id" },
      sender: { id: "private-sender" },
      reply,
    } as unknown as Interaction;

    await handleInboundInteraction(
      interaction,
      "telegram",
      state,
      {} as GeminiReportNarrator,
    );

    expect(acceptDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalDecision: "SEAL_BAY_3",
        conversationId: "conversation-id",
        parseMethod: "command",
      }),
    );
    expect(claimInbound).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "telegram",
        conversationId: "conversation-id",
        mediaCount: 0,
      }),
    );
    expect(completeInbound).toHaveBeenCalledWith(
      expect.stringMatching(/^interaction:[a-f0-9]{64}$/),
      "interaction.decision_applied",
    );
    expect(JSON.stringify(acceptDecision.mock.calls)).not.toContain(
      "private-sender",
    );
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining(
        "EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY",
      ),
    );
  });

  it("drops a replay before the interaction can cause another decision", async () => {
    const state = {
      claimInbound: vi.fn().mockResolvedValue({
        duplicate: true,
        rateLimited: false,
      }),
      activePrompt: vi.fn(),
      acceptDecision: vi.fn(),
      completeInbound: vi.fn(),
      generateReportNarrative: vi.fn(),
    };
    const interaction = {
      connectionId: "connection-id",
      conversationId: "conversation-id",
      value: "decision:SEAL_BAY_3",
      sourceMessage: { id: "source-message-id" },
      sender: { id: "private-sender" },
      reply: vi.fn(),
    } as unknown as Interaction;

    await handleInboundInteraction(
      interaction,
      "telegram",
      state,
      {} as GeminiReportNarrator,
    );

    expect(state.activePrompt).not.toHaveBeenCalled();
    expect(state.acceptDecision).not.toHaveBeenCalled();
    expect(state.completeInbound).not.toHaveBeenCalled();
  });

  it("registers exactly one message handler and gates the optional interaction handler", () => {
    const onMessage = vi.fn();
    const onInteraction = vi.fn();
    const client = { onMessage, onInteraction } as unknown as CommClient;

    registerSharedHandler(
      client,
      {} as AgentState,
      {} as GeminiDecisionClassifier,
      {} as GeminiReportNarrator,
      catalog,
      [
        {
          channel: "telegram",
          connectionId: "private-connection",
          status: "active",
        },
      ],
    );
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onInteraction).toHaveBeenCalledTimes(1);

    const textOnlyOnMessage = vi.fn();
    const textOnlyOnInteraction = vi.fn();
    const textOnlyClient = {
      onMessage: textOnlyOnMessage,
      onInteraction: textOnlyOnInteraction,
    } as unknown as CommClient;
    registerSharedHandler(
      textOnlyClient,
      {} as AgentState,
      {} as GeminiDecisionClassifier,
      {} as GeminiReportNarrator,
      catalog,
      [
        {
          channel: "email",
          connectionId: "private-connection",
          status: "active",
        },
      ],
    );
    expect(textOnlyOnMessage).toHaveBeenCalledTimes(1);
    expect(textOnlyOnInteraction).not.toHaveBeenCalled();
  });
});
