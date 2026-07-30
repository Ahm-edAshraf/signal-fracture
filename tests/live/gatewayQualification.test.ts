import { describe, expect, it } from "vitest";

const liveEnabled = process.env.ENABLE_LIVE_TESTS === "true";

describe("live Caspian gateway qualification", () => {
  it.skipIf(!liveEnabled)(
    "advertises the required receive, reply, and send capabilities",
    async () => {
      const apiKey = process.env.CASPIAN_API_KEY;
      const baseUrl = process.env.CASPIAN_BASE_URL;
      expect(apiKey, "CASPIAN_API_KEY must be configured").toBeTruthy();
      expect(baseUrl, "CASPIAN_BASE_URL must be configured").toBeTruthy();

      const response = await fetch(`${baseUrl}/v1/channels`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(response.ok).toBe(true);
      const body = (await response.json()) as {
        channel?: string;
        provider?: string;
        capabilities?: string[];
      }[];

      for (const target of ["email", "telegram", "discord"]) {
        const candidates = body.filter(
          ({ channel, provider }) => channel === target || provider === target,
        );
        expect(
          candidates.length,
          `${target} must be available`,
        ).toBeGreaterThan(0);
        const capabilities = new Set(
          candidates.flatMap(({ capabilities }) => capabilities ?? []),
        );
        expect(capabilities.has("receive"), `${target} receive`).toBe(true);
        expect(capabilities.has("reply"), `${target} reply`).toBe(true);
        expect(capabilities.has("send"), `${target} send`).toBe(true);
      }
    },
    30_000,
  );

  it("does not permit a send-only opt-in without live tests", () => {
    const sendEnabled = process.env.ENABLE_LIVE_SENDS === "true";
    expect(!sendEnabled || liveEnabled).toBe(true);
  });
});
