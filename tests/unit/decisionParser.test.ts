import { parseDeterministicDecision } from "@signal-fracture/core";
import { describe, expect, it } from "vitest";

describe("deterministic decision parser", () => {
  it("accepts case and whitespace variations", () => {
    expect(
      parseDeterministicDecision("  seal   bay 3 ", ["SEAL_BAY_3", "WAIT"]),
    ).toEqual({ decision: "SEAL_BAY_3", method: "command" });
  });

  it("accepts conservative known phrases", () => {
    expect(
      parseDeterministicDecision("Seal it immediately", ["SEAL_BAY_3"]),
    ).toEqual({ decision: "SEAL_BAY_3", method: "phrase" });
  });

  it("never returns a choice outside the active allowlist", () => {
    expect(
      parseDeterministicDecision("ROUTE BAY 3", ["ROUTE_BAY_5"]),
    ).toBeNull();
    expect(
      parseDeterministicDecision("do something surprising", ["WAIT"]),
    ).toBeNull();
  });
});
