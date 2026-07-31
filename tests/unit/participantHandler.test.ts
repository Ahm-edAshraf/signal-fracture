import { describe, expect, it, vi } from "vitest";
import type {
  GeminiDecisionClassifier,
  GeminiReportNarrator,
} from "@signal-fracture/ai";
import { handleInboundMessage } from "../../apps/agent/src/handleInboundMessage";
import type { AgentState } from "../../apps/agent/src/state";

type HandlerMessage = Parameters<typeof handleInboundMessage>[0];

function message(text: string): {
  value: HandlerMessage;
  reply: ReturnType<typeof vi.fn>;
  react: ReturnType<typeof vi.fn>;
} {
  const reply = vi.fn().mockResolvedValue({});
  const react = vi.fn().mockResolvedValue({ reacted: true });
  const value = {
    id: `message:${text}`,
    conversationId: "participant-conversation",
    connectionId: "telegram-connection",
    channel: "telegram",
    sender: { id: "private-participant" },
    subject: null,
    text,
    media: [],
    reply,
    react,
  } as HandlerMessage;
  return { value, reply, react };
}

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    claimInbound: vi.fn().mockResolvedValue({
      duplicate: false,
      recovered: false,
      rateLimited: false,
    }),
    completeInbound: vi.fn().mockResolvedValue(undefined),
    activePrompt: vi.fn().mockResolvedValue({
      injectId: "inject-id",
      injectKey: "F1",
      status: "open",
      version: 2,
      allowedDecisions: ["SEAL_BAY_3", "WAIT"],
      exerciseText: "exercise",
      clarificationCount: 0,
      roleKey: "field",
      sessionStatus: "running",
      pauseReason: null,
    }),
    acceptDecision: vi.fn().mockResolvedValue({
      outcome: "applied",
      sessionFinalized: false,
    }),
    requestClarification: vi.fn().mockResolvedValue({
      outcome: "clarification",
      showExplicitOptions: false,
    }),
    abortByConversation: vi.fn().mockResolvedValue({ aborted: true }),
    statusForConversation: vi.fn(),
    joinRole: vi.fn(),
    generateReportNarrative: vi.fn(),
    ...overrides,
  };
}

function classifier(result: unknown): {
  value: GeminiDecisionClassifier;
  classify: ReturnType<typeof vi.fn>;
} {
  const classify = vi.fn().mockResolvedValue(result);
  return {
    value: { classify } as unknown as GeminiDecisionClassifier,
    classify,
  };
}

describe("shared participant message handler", () => {
  it("applies an exact command without calling Gemini", async () => {
    const inbound = message("SEAL BAY 3");
    const state = baseState();
    const model = classifier({ status: "unavailable", explicitOptions: [] });

    await handleInboundMessage(
      inbound.value,
      state as unknown as AgentState,
      model.value,
      {} as GeminiReportNarrator,
      new Map([["telegram", new Set(["reactions"])]]),
    );

    expect(model.classify).not.toHaveBeenCalled();
    expect(state.acceptDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalDecision: "SEAL_BAY_3",
        parseMethod: "command",
      }),
    );
    expect(inbound.reply).toHaveBeenCalledWith(
      expect.stringContaining(
        "EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY",
      ),
    );
    expect(state.completeInbound).toHaveBeenCalledTimes(1);
    expect(inbound.react).toHaveBeenCalledWith("👀");
  });

  it("keeps ABORT independent of Gemini and scenario prompts", async () => {
    const inbound = message("ABORT");
    const state = baseState();
    const model = classifier({ status: "unavailable", explicitOptions: [] });

    await handleInboundMessage(
      inbound.value,
      state as unknown as AgentState,
      model.value,
      {} as GeminiReportNarrator,
    );

    expect(state.abortByConversation).toHaveBeenCalledWith(
      "participant-conversation",
    );
    expect(state.activePrompt).not.toHaveBeenCalled();
    expect(model.classify).not.toHaveBeenCalled();
  });

  it("returns explicit active choices during total model outage", async () => {
    const inbound = message("I am uncertain what to do");
    const state = baseState();
    const model = classifier({
      status: "unavailable",
      explicitOptions: ["SEAL_BAY_3", "WAIT"],
    });

    await handleInboundMessage(
      inbound.value,
      state as unknown as AgentState,
      model.value,
      {} as GeminiReportNarrator,
    );

    expect(state.acceptDecision).not.toHaveBeenCalled();
    expect(state.requestClarification).toHaveBeenCalledWith(
      expect.objectContaining({ modelUsed: "none" }),
    );
    expect(inbound.reply).toHaveBeenCalledWith(
      expect.stringContaining("Reply with one exact choice: SEAL_BAY_3, WAIT"),
    );
  });

  it("rejects a known stale choice before model classification", async () => {
    const inbound = message("SEAL BAY 3");
    const state = baseState({
      activePrompt: vi.fn().mockResolvedValue({
        injectId: "control-inject",
        injectKey: "C1",
        status: "open",
        version: 3,
        allowedDecisions: ["ROUTE_BAY_3", "ROUTE_BAY_5"],
        exerciseText: "exercise",
        clarificationCount: 0,
        roleKey: "control",
        sessionStatus: "running",
        pauseReason: null,
      }),
    });
    const model = classifier({ status: "unavailable", explicitOptions: [] });

    await handleInboundMessage(
      inbound.value,
      state as unknown as AgentState,
      model.value,
      {} as GeminiReportNarrator,
    );

    expect(state.acceptDecision).not.toHaveBeenCalled();
    expect(model.classify).not.toHaveBeenCalled();
    expect(inbound.reply).toHaveBeenCalledWith(
      expect.stringContaining("current valid choices are: ROUTE_BAY_3"),
    );
  });
});
