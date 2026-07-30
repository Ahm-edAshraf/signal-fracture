import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

const payloadSchema = z.object({
  scenario: z.literal("ASTERIA"),
  role: z.enum(["field", "control", "director"]),
  expiresAt: z.number().int().positive(),
  nonce: z.string().min(16),
});

export type RoleCodePayload = z.infer<typeof payloadSchema>;

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function hashRoleCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function createRoleCode(input: {
  role: RoleCodePayload["role"];
  expiresAt: number;
  secret: string;
}): string {
  const payload: RoleCodePayload = {
    scenario: "ASTERIA",
    role: input.role,
    expiresAt: input.expiresAt,
    nonce: randomBytes(18).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, input.secret).toString("base64url")}`;
}

export function verifyRoleCode(
  code: string,
  secret: string,
  now = Date.now(),
): RoleCodePayload | null {
  const [encoded, signature, extra] = code.split(".");
  if (encoded === undefined || signature === undefined || extra !== undefined) {
    return null;
  }
  const expected = sign(encoded, secret);
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return null;
  }
  try {
    const payload = payloadSchema.parse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    );
    return payload.expiresAt > now ? payload : null;
  } catch {
    return null;
  }
}
