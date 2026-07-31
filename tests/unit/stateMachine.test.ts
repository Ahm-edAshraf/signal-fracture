import {
  canTransitionInject,
  canTransitionSession,
} from "@signal-fracture/core";
import { describe, expect, it } from "vitest";

describe("state machines", () => {
  it("allows forward session transitions and aborts", () => {
    expect(canTransitionSession("draft", "ready")).toBe(true);
    expect(canTransitionSession("running", "resolving")).toBe(true);
    expect(canTransitionSession("paused", "aborted")).toBe(true);
    expect(canTransitionSession("paused", "resolving")).toBe(true);
    expect(canTransitionSession("draft", "aborted")).toBe(true);
  });

  it("keeps final session states immutable", () => {
    expect(canTransitionSession("completed", "running")).toBe(false);
    expect(canTransitionSession("aborted", "running")).toBe(false);
    expect(canTransitionSession("failed", "running")).toBe(false);
  });

  it("models retry and open inject paths without regressions", () => {
    expect(canTransitionInject("queued", "retrying")).toBe(true);
    expect(canTransitionInject("queued", "open")).toBe(true);
    expect(canTransitionInject("retrying", "sent")).toBe(true);
    expect(canTransitionInject("open", "answered")).toBe(true);
    expect(canTransitionInject("answered", "open")).toBe(false);
    expect(canTransitionInject("closed", "open")).toBe(false);
  });
});
