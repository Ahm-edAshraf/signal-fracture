import { serializePublicLog } from "../../apps/agent/src/publicLog";
import { channelHealthProjection } from "../../apps/agent/src/state";
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

describe("public channel health projection", () => {
  it("removes private connection identifiers before persistence", () => {
    const projected = channelHealthProjection([
      {
        channel: "telegram",
        status: "active",
        connectionId: "private-connection-id",
      },
    ]);
    expect(projected).toEqual([{ channel: "telegram", status: "active" }]);
    expect(JSON.stringify(projected)).not.toContain("connection");
  });
});
