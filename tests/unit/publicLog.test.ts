import { serializePublicLog } from "../../apps/agent/src/publicLog";
import { describe, expect, it } from "vitest";

describe("public log contract", () => {
  it("serializes only the explicitly safe event shape", () => {
    const line = serializePublicLog({
      event: "delivery_failed",
      channel: "telegram",
      errorCode: "caspian_http_503",
      attempt: 2,
      permanent: false,
    });
    expect(line).toBe(
      '{"event":"delivery_failed","channel":"telegram","errorCode":"caspian_http_503","attempt":2,"permanent":false}',
    );
    expect(line).not.toMatch(/token|conversation|sender|participant/i);
  });
});
