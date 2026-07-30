import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sf_operator";

function configuredSecret(): string {
  const secret = process.env.OPERATOR_SECRET;
  if (secret === undefined || secret.length < 16) {
    throw new Error("Operator authentication is not configured");
  }
  return secret;
}

function signature(expiresAt: string, secret: string): string {
  return createHmac("sha256", secret).update(expiresAt).digest("base64url");
}

export function secretMatches(candidate: string): boolean {
  const expected = Buffer.from(configuredSecret());
  const supplied = Buffer.from(candidate);
  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
}

export async function issueOperatorCookie(): Promise<void> {
  const expiresAt = String(Date.now() + 4 * 60 * 60 * 1_000);
  const value = `${expiresAt}.${signature(expiresAt, configuredSecret())}`;
  (await cookies()).set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 4 * 60 * 60,
    path: "/",
  });
}

export async function clearOperatorCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isOperatorAuthenticated(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (value === undefined) return false;
  const [expiresAt, supplied, extra] = value.split(".");
  if (
    expiresAt === undefined ||
    supplied === undefined ||
    extra !== undefined ||
    Number(expiresAt) <= Date.now()
  ) {
    return false;
  }
  const expected = Buffer.from(signature(expiresAt, configuredSecret()));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function operatorSecret(): string {
  return configuredSecret();
}
