import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOperatorSecret } from "./auth";
import { writeDeterministicReport } from "./reportData";

export const generate = mutation({
  args: {
    operatorSecret: v.string(),
    sessionId: v.id("sessions"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    return await writeDeterministicReport(ctx, args.sessionId, args.now);
  },
});

export const getPublic = query({
  args: { publicCode: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_public_code", (q) => q.eq("publicCode", args.publicCode))
      .first();
    if (session === null) return null;
    const report = await ctx.db
      .query("reports")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .first();
    if (report === null) return null;
    return {
      publicCode: session.publicCode,
      scenarioId: session.scenarioId,
      status: session.status,
      metrics: report.metrics,
      deterministicSummary: report.deterministicSummary,
      narrative: report.narrative ?? null,
      generatedAt: report.generatedAt,
    };
  },
});
