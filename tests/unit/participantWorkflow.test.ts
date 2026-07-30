import { parseParticipantCommand } from "../../apps/agent/src/commandRouter";
import { stripEmailQuotedReply } from "../../apps/agent/src/emailQuoteStripper";
import { readAgentEnvironment } from "../../apps/agent/src/env";
import {
  createRoleCode,
  hashRoleCode,
  verifyRoleCode,
} from "../../apps/agent/src/roleCodes";
import { describe, expect, it } from "vitest";

describe("participant workflow utilities", () => {
  it("parses channel-neutral commands", () => {
    expect(parseParticipantCommand(" help ")).toEqual({ type: "help" });
    expect(parseParticipantCommand("STATUS")).toEqual({ type: "status" });
    expect(parseParticipantCommand("abort")).toEqual({ type: "abort" });
    expect(parseParticipantCommand("leave")).toEqual({ type: "leave" });
    expect(parseParticipantCommand("JOIN ASTERIA FIELD signed.code")).toEqual({
      type: "join",
      scenario: "ASTERIA",
      role: "field",
      code: "signed.code",
    });
  });

  it("strips quoted email content before parsing a one-word reply", () => {
    const email = [
      "WAIT FOR CONFIRMATION",
      "",
      "On Thu, 31 Jul 2026 at 10:00, Signal Fracture wrote:",
      "> Choose NOTIFY COMMANDER or WAIT FOR CONFIRMATION",
    ].join("\r\n");
    expect(stripEmailQuotedReply(email)).toBe("WAIT FOR CONFIRMATION");
  });

  it("strips original-message headers and quote lines", () => {
    expect(
      stripEmailQuotedReply(
        "ESCALATE NOW\n\n-----Original Message-----\nFrom: hidden@example.test",
      ),
    ).toBe("ESCALATE NOW");
    expect(stripEmailQuotedReply("> old\nPASSAGE BLOCKED")).toBe(
      "PASSAGE BLOCKED",
    );
  });

  it("creates signed, role-bound, expiring codes", () => {
    const secret = "a-strong-test-secret-that-is-not-real";
    const code = createRoleCode({
      role: "control",
      expiresAt: 2_000,
      secret,
    });
    expect(verifyRoleCode(code, secret, 1_000)).toMatchObject({
      scenario: "ASTERIA",
      role: "control",
      expiresAt: 2_000,
    });
    expect(verifyRoleCode(code, secret, 2_000)).toBeNull();
    expect(verifyRoleCode(`${code}tampered`, secret, 1_000)).toBeNull();
    expect(hashRoleCode(code)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("uses the platform PORT for health checks when no explicit port is set", () => {
    const env = readAgentEnvironment({
      CASPIAN_API_KEY: "test-key",
      CASPIAN_BASE_URL: "https://api.example.test",
      CONVEX_URL: "https://convex.example.test",
      OPERATOR_SECRET: "test-operator-secret",
      GEMINI_API_KEY: "test-gemini-key",
      GEMINI_PRIMARY_MODEL: "primary-model",
      GEMINI_FALLBACK_MODEL: "fallback-model",
      PORT: "8080",
    });
    expect(env.AGENT_HEALTH_PORT).toBe(8080);
  });
});
