import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { createRoleCode, hashRoleCode } from "@signal-fracture/shared";
import {
  createDemoSession,
  currentOperatorSession,
  resetDemoTenant,
  startDemoSession,
} from "../../../../lib/convexApi";
import {
  isOperatorAuthenticated,
  operatorSecret,
} from "../../../../lib/operatorAuth";

export const runtime = "nodejs";

function client(): ConvexHttpClient {
  const url = process.env.CONVEX_URL;
  if (url === undefined) throw new Error("CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

export async function GET() {
  if (!(await isOperatorAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const current = await client().query(currentOperatorSession, {
    operatorSecret: operatorSecret(),
    demoTenant: process.env.DEMO_TENANT_ID ?? "signal-fracture-demo",
  });
  return NextResponse.json({ current });
}

export async function POST(request: Request) {
  if (!(await isOperatorAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    sessionId?: unknown;
  } | null;
  const action = body?.action;
  const secret = operatorSecret();
  const convex = client();
  const now = Date.now();

  if (action === "create") {
    const expiresAt =
      now + Number(process.env.ROLE_CODE_TTL_MINUTES ?? 60) * 60_000;
    const roles = ["field", "control", "director"] as const;
    const codes = roles.map((role) => ({
      role,
      code: createRoleCode({ role, expiresAt, secret }),
    }));
    const sessionId = await convex.mutation(createDemoSession, {
      operatorSecret: secret,
      demoTenant: process.env.DEMO_TENANT_ID ?? "signal-fracture-demo",
      publicCode: "ASTERIA",
      roleCodes: codes.map(({ role, code }) => ({
        roleKey: role,
        joinCodeHash: hashRoleCode(code),
        joinCodeExpiresAt: expiresAt,
      })),
      now,
    });
    return NextResponse.json({
      sessionId,
      expiresAt,
      joins: codes.map(({ role, code }) => ({
        role,
        command: `JOIN ASTERIA ${role.toUpperCase()} ${code}`,
      })),
    });
  }

  if (action === "start" && typeof body?.sessionId === "string") {
    const result = await convex.mutation(startDemoSession, {
      operatorSecret: secret,
      sessionId: body.sessionId,
      now,
    });
    return NextResponse.json(result);
  }

  if (action === "reset") {
    const result = await convex.mutation(resetDemoTenant, {
      operatorSecret: secret,
      demoTenant: process.env.DEMO_TENANT_ID ?? "signal-fracture-demo",
    });
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Invalid operator action" },
    { status: 400 },
  );
}
