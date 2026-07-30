import { GoogleGenAI } from "@google/genai";
import {
  classificationJsonSchema,
  decisionClassificationSchema,
  type DecisionClassification,
} from "./schema";
import { decisionPrompt } from "./prompts";

export type GenerateStructured = (input: {
  model: string;
  prompt: string;
  responseJsonSchema: unknown;
}) => Promise<string>;

export type ClassifierConfig = {
  apiKey: string;
  primaryModel: string;
  fallbackModel: string;
  confidenceThreshold: number;
  timeoutMs: number;
};

export type ClassificationOutcome =
  | {
      status: "accepted";
      classification: DecisionClassification & { decision: string };
      model: "primary" | "fallback";
    }
  | {
      status: "clarification";
      classification: DecisionClassification | null;
      reason: "ambiguous" | "unsafe" | "invalid_model_output";
      model: "primary" | "fallback" | "none";
    }
  | { status: "unavailable"; explicitOptions: readonly string[] };

function createGenerator(apiKey: string): GenerateStructured {
  const ai = new GoogleGenAI({ apiKey });
  return async ({ model, prompt, responseJsonSchema }) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        temperature: 0,
      },
    });
    if (response.text === undefined) throw new Error("Gemini returned no text");
    return response.text;
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Gemini request timed out")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function parseClassification(
  raw: string,
  allowedDecisions: readonly string[],
): DecisionClassification {
  const parsed = decisionClassificationSchema.parse(JSON.parse(raw));
  if (parsed.decision !== null && !allowedDecisions.includes(parsed.decision)) {
    throw new Error("Model returned a decision outside the active allowlist");
  }
  return parsed;
}

export class GeminiDecisionClassifier {
  readonly #config: ClassifierConfig;
  readonly #generate: GenerateStructured;

  constructor(
    config: ClassifierConfig,
    generate = createGenerator(config.apiKey),
  ) {
    this.#config = config;
    this.#generate = generate;
  }

  async classify(input: {
    participantText: string;
    allowedDecisions: readonly string[];
  }): Promise<ClassificationOutcome> {
    const prompt = decisionPrompt(input);
    const responseJsonSchema = classificationJsonSchema(input.allowedDecisions);
    let hadInvalidOutput = false;

    for (const [model, label] of [
      [this.#config.primaryModel, "primary"],
      [this.#config.fallbackModel, "fallback"],
    ] as const) {
      let raw: string;
      try {
        raw = await withTimeout(
          this.#generate({ model, prompt, responseJsonSchema }),
          this.#config.timeoutMs,
        );
      } catch {
        continue;
      }

      try {
        const classification = parseClassification(raw, input.allowedDecisions);
        if (!classification.safety.exerciseOnly) {
          return {
            status: "clarification",
            classification,
            reason: "unsafe",
            model: label,
          };
        }
        if (
          classification.decision === null ||
          classification.clarificationNeeded ||
          classification.confidence < this.#config.confidenceThreshold
        ) {
          return {
            status: "clarification",
            classification,
            reason: "ambiguous",
            model: label,
          };
        }
        return {
          status: "accepted",
          classification: {
            ...classification,
            decision: classification.decision,
          },
          model: label,
        };
      } catch {
        hadInvalidOutput = true;
      }
    }

    if (hadInvalidOutput) {
      return {
        status: "clarification",
        classification: null,
        reason: "invalid_model_output",
        model: "none",
      };
    }
    return { status: "unavailable", explicitOptions: input.allowedDecisions };
  }
}
