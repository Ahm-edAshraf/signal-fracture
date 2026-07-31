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
      narrativeModelLatencyMs: report.narrativeModelLatencyMs ?? null,
      narrativeModelUsed: report.narrativeModelUsed ?? null,
      generatedAt: report.generatedAt,
    };
  },
});

export const getNarrationInput = query({
  args: {
    operatorSecret: v.string(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    const report = await ctx.db
      .query("reports")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    if (report === null) return null;
    return {
      reportId: report._id,
      metrics: report.metrics,
      deterministicSummary: report.deterministicSummary,
    };
  },
});

export const attachNarrative = mutation({
  args: {
    operatorSecret: v.string(),
    reportId: v.id("reports"),
    narrative: v.string(),
    modelLatencyMs: v.number(),
    modelUsed: v.union(v.literal("primary"), v.literal("fallback")),
  },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    const report = await ctx.db.get(args.reportId);
    if (report === null) return false;
    const narrative = args.narrative.trim();
    if (narrative.length === 0 || narrative.length > 900) return false;
    await ctx.db.patch(report._id, {
      narrative,
      narrativeModelLatencyMs: Math.max(0, args.modelLatencyMs),
      narrativeModelUsed: args.modelUsed,
    });
    return true;
  },
});
