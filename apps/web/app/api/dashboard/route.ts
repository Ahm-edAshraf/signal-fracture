import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { dashboardPublicState } from "../../../lib/convexApi";

export const dynamic = "force-dynamic";

export async function GET() {
  const convexUrl = process.env.CONVEX_URL;
  if (convexUrl === undefined) {
    return NextResponse.json(
      { error: "Dashboard data is not configured" },
      { status: 503 },
    );
  }
  const client = new ConvexHttpClient(convexUrl);
  const state = await client.query(dashboardPublicState, {
    publicCode: "ASTERIA",
  });
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
