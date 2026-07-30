import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOperatorSecret } from "./auth";

export const record = mutation({
  args: {
    operatorSecret: v.string(),
    channels: v.array(
      v.object({
        channel: v.string(),
        status: v.string(),
      }),
    ),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    for (const item of args.channels) {
      const current = await ctx.db
        .query("channelHealth")
        .withIndex("by_channel", (q) => q.eq("channel", item.channel))
        .unique();
      if (current === null) {
        await ctx.db.insert("channelHealth", {
          ...item,
          checkedAt: args.checkedAt,
        });
      } else {
        await ctx.db.patch(current._id, {
          status: item.status,
          checkedAt: args.checkedAt,
        });
      }
    }
    return args.channels.length;
  },
});

export const publicStatus = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("channelHealth").collect();
    return rows
      .map(({ channel, status, checkedAt }) => ({
        channel,
        status,
        checkedAt,
      }))
      .sort((a, b) => a.channel.localeCompare(b.channel));
  },
});
