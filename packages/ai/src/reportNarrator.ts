import { z } from "zod";
import {
  createGenerator,
  withTimeout,
  type GenerateStructured,
} from "./gemini";

const reportNarrativeSchema = z.object({
  narrative: z.string().min(1).max(900),
});

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["narrative"],
  properties: {
    narrative: { type: "string", minLength: 1, maxLength: 900 },
  },
} as const;

export type ReportNarratorConfig = {
  apiKey: string;
  primaryModel: string;
  fallbackModel: string;
  timeoutMs: number;
};

export type ReportNarrativeOutcome =
  | { status: "generated"; narrative: string; model: "primary" | "fallback" }
  | { status: "unavailable" };

export class GeminiReportNarrator {
  readonly #config: ReportNarratorConfig;
  readonly #generate: GenerateStructured;

  constructor(
    config: ReportNarratorConfig,
    generate = createGenerator(config.apiKey),
  ) {
    this.#config = config;
    this.#generate = generate;
  }

  async narrate(input: {
    deterministicSummary: string;
    metrics: unknown;
  }): Promise<ReportNarrativeOutcome> {
    const evidence = JSON.stringify({
      deterministicSummary: input.deterministicSummary,
      metrics: input.metrics,
    });
    const prompt = [
      "Write a concise after-action narrative for a fictional coordination drill.",
      "Return only the requested JSON object.",
      "Use only the supplied deterministic summary and metrics.",
      "Do not infer identities, causes, events, decisions, measurements, or outcomes that are absent from the evidence.",
      "Do not give real-world emergency or operational instructions.",
      "Keep the narrative factual, audit-friendly, and under 120 words.",
      "DETERMINISTIC_EVIDENCE_BEGIN",
      evidence.slice(0, 20_000),
      "DETERMINISTIC_EVIDENCE_END",
    ].join("\n");

    for (const [model, label] of [
      [this.#config.primaryModel, "primary"],
      [this.#config.fallbackModel, "fallback"],
    ] as const) {
      try {
        const raw = await withTimeout(
          this.#generate({ model, prompt, responseJsonSchema }),
          this.#config.timeoutMs,
        );
        const parsed = reportNarrativeSchema.parse(JSON.parse(raw));
        return {
          status: "generated",
          narrative: parsed.narrative,
          model: label,
        };
      } catch {
        // The deterministic report remains authoritative when narration fails.
      }
    }
    return { status: "unavailable" };
  }
}
