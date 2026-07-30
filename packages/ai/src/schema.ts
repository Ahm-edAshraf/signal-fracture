import { z } from "zod";

export const decisionClassificationSchema = z.object({
  decision: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  clarificationNeeded: z.boolean(),
  rationaleSummary: z.string().max(240).nullable(),
  safety: z.object({
    exerciseOnly: z.boolean(),
    rejectReason: z.string().max(240).nullable(),
  }),
});

export type DecisionClassification = z.infer<
  typeof decisionClassificationSchema
>;

export function classificationJsonSchema(allowedDecisions: readonly string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "decision",
      "confidence",
      "clarificationNeeded",
      "rationaleSummary",
      "safety",
    ],
    properties: {
      decision: {
        anyOf: [{ type: "string", enum: allowedDecisions }, { type: "null" }],
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      clarificationNeeded: { type: "boolean" },
      rationaleSummary: {
        anyOf: [{ type: "string", maxLength: 240 }, { type: "null" }],
      },
      safety: {
        type: "object",
        additionalProperties: false,
        required: ["exerciseOnly", "rejectReason"],
        properties: {
          exerciseOnly: { type: "boolean" },
          rejectReason: {
            anyOf: [{ type: "string", maxLength: 240 }, { type: "null" }],
          },
        },
      },
    },
  } as const;
}
