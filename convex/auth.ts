import { ConvexError } from "convex/values";

export function requireOperatorSecret(value: string): void {
  const expected = process.env.OPERATOR_SECRET;
  if (expected === undefined || expected.length < 16 || value !== expected) {
    throw new ConvexError("Unauthorized operator request");
  }
}
