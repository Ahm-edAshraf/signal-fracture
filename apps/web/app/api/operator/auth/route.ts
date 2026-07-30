import { NextResponse } from "next/server";
import {
  clearOperatorCookie,
  isOperatorAuthenticated,
  issueOperatorCookie,
  secretMatches,
} from "../../../../lib/operatorAuth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ authenticated: await isOperatorAuthenticated() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    secret?: unknown;
  } | null;
  if (typeof body?.secret !== "string" || !secretMatches(body.secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await issueOperatorCookie();
  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  await clearOperatorCookie();
  return NextResponse.json({ authenticated: false });
}
