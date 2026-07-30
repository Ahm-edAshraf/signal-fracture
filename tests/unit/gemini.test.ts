import {
  GeminiDecisionClassifier,
  type GenerateStructured,
} from "@signal-fracture/ai";
import { describe, expect, it, vi } from "vitest";

const config = {
  apiKey: "test-key",
  primaryModel: "primary-model",
  fallbackModel: "fallback-model",
  confidenceThreshold: 0.82,
  timeoutMs: 100,
};

function response(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    decision: "SEAL_BAY_3",
    confidence: 0.98,
    clarificationNeeded: false,
    rationaleSummary: "Participant wants to seal the bay.",
    safety: { exerciseOnly: true, rejectReason: null },
    ...overrides,
  });
}

describe("Gemini decision boundary", () => {
  it("accepts only an active allowed decision", async () => {
    const generate = vi.fn<GenerateStructured>().mockResolvedValue(response());
    const classifier = new GeminiDecisionClassifier(config, generate);
    const result = await classifier.classify({
      participantText: "seal it now",
      allowedDecisions: ["SEAL_BAY_3", "WAIT"],
    });

    expect(result.status).toBe("accepted");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[0].responseJsonSchema).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          decision: expect.objectContaining({
            anyOf: expect.arrayContaining([
              expect.objectContaining({ enum: ["SEAL_BAY_3", "WAIT"] }),
            ]),
          }),
        }),
      }),
    );
  });

  it("requests clarification below the confidence threshold", async () => {
    const classifier = new GeminiDecisionClassifier(
      config,
      vi
        .fn<GenerateStructured>()
        .mockResolvedValue(response({ confidence: 0.4 })),
    );
    await expect(
      classifier.classify({
        participantText: "maybe",
        allowedDecisions: ["SEAL_BAY_3", "WAIT"],
      }),
    ).resolves.toMatchObject({ status: "clarification", reason: "ambiguous" });
  });

  it("falls back after a primary model failure", async () => {
    const generate = vi
      .fn<GenerateStructured>()
      .mockRejectedValueOnce(new Error("primary down"))
      .mockResolvedValueOnce(response());
    const classifier = new GeminiDecisionClassifier(config, generate);
    await expect(
      classifier.classify({
        participantText: "seal it",
        allowedDecisions: ["SEAL_BAY_3"],
      }),
    ).resolves.toMatchObject({ status: "accepted", model: "fallback" });
  });

  it("falls back to explicit options during a total outage", async () => {
    const classifier = new GeminiDecisionClassifier(
      config,
      vi.fn<GenerateStructured>().mockRejectedValue(new Error("offline")),
    );
    await expect(
      classifier.classify({
        participantText: "seal it",
        allowedDecisions: ["SEAL_BAY_3", "WAIT"],
      }),
    ).resolves.toEqual({
      status: "unavailable",
      explicitOptions: ["SEAL_BAY_3", "WAIT"],
    });
  });

  it("rejects malformed or out-of-allowlist model output", async () => {
    const generate = vi
      .fn<GenerateStructured>()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(response({ decision: "INVENTED_ACTION" }));
    const classifier = new GeminiDecisionClassifier(config, generate);
    await expect(
      classifier.classify({
        participantText: "invent something",
        allowedDecisions: ["WAIT"],
      }),
    ).resolves.toMatchObject({
      status: "clarification",
      reason: "invalid_model_output",
      model: "none",
    });
  });

  it("rejects real-world unsafe intent", async () => {
    const classifier = new GeminiDecisionClassifier(
      config,
      vi.fn<GenerateStructured>().mockResolvedValue(
        response({
          decision: null,
          confidence: 1,
          clarificationNeeded: true,
          safety: {
            exerciseOnly: false,
            rejectReason: "Real emergency request",
          },
        }),
      ),
    );
    await expect(
      classifier.classify({
        participantText: "dispatch real responders",
        allowedDecisions: ["WAIT"],
      }),
    ).resolves.toMatchObject({ status: "clarification", reason: "unsafe" });
  });
});
