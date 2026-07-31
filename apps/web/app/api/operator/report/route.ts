import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { dashboardPublicState } from "../../../../lib/convexApi";
import { isOperatorAuthenticated } from "../../../../lib/operatorAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportableState = {
  session: null | { publicCode: string; status: string };
  report?: unknown;
};

export async function GET() {
  if (!(await isOperatorAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convexUrl = process.env.CONVEX_URL;
  if (convexUrl === undefined) {
    return NextResponse.json(
      { error: "Report export is not configured" },
      { status: 503 },
    );
  }
  const state = (await new ConvexHttpClient(convexUrl).query(
    dashboardPublicState,
    { publicCode: "ASTERIA" },
  )) as ExportableState;
  if (
    state.session === null ||
    state.session.status !== "completed" ||
    state.report == null
  ) {
    return NextResponse.json(
      { error: "A completed after-action report is not available" },
      { status: 409 },
    );
  }
  const filename = `signal-fracture-${state.session.publicCode}-report.json`;
  return new Response(`${JSON.stringify(state, null, 2)}\n`, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
