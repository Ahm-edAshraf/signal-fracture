import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireOperatorSecret } from "./auth";

export const latestForChannel = query({
  args: { channel: v.string(), operatorSecret: v.string() },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    const contact = await ctx.db
      .query("conversationContacts")
      .withIndex("by_channel_last_seen", (q) => q.eq("channel", args.channel))
      .order("desc")
      .first();
    if (contact === null) return null;
    return {
      channel: contact.channel,
      connectionId: contact.connectionId,
      conversationId: contact.conversationId,
    };
  },
});
