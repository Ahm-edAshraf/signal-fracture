import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const load = query({
  args: {},
  handler: async (ctx) => {
    const checkpoint = await ctx.db
      .query("eventCheckpoints")
      .withIndex("by_key", (q) => q.eq("key", "caspian"))
      .unique();
    return checkpoint?.lastSeq ?? null;
  },
});

export const save = mutation({
  args: { lastSeq: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eventCheckpoints")
      .withIndex("by_key", (q) => q.eq("key", "caspian"))
      .unique();
    if (existing !== null && args.lastSeq <= existing.lastSeq) {
      return existing.lastSeq;
    }
    const now = Date.now();
    if (existing === null) {
      await ctx.db.insert("eventCheckpoints", {
        key: "caspian",
        lastSeq: args.lastSeq,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        lastSeq: args.lastSeq,
        updatedAt: now,
      });
    }
    return args.lastSeq;
  },
});
