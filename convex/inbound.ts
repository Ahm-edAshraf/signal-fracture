import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const claim = mutation({
  args: {
    caspianEventId: v.string(),
    messageId: v.string(),
    conversationId: v.string(),
    conversationIdHash: v.string(),
    connectionId: v.string(),
    channel: v.string(),
    senderFingerprint: v.string(),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("inboundEvents")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        duplicateCount: (existing.duplicateCount ?? 0) + 1,
      });
      return {
        duplicate: true,
        rateLimited: false,
        outcomeRef: existing.outcomeRef ?? null,
      };
    }

    const recent = await ctx.db
      .query("inboundEvents")
      .withIndex("by_conversation_received", (q) =>
        q
          .eq("conversationIdHash", args.conversationIdHash)
          .gte("receivedAt", args.receivedAt - 60_000),
      )
      .collect();
    const rateLimited = recent.length >= 20;

    await ctx.db.insert("inboundEvents", {
      caspianEventId: args.caspianEventId,
      messageId: args.messageId,
      conversationIdHash: args.conversationIdHash,
      channel: args.channel,
      status: rateLimited ? "processed" : "claimed",
      ...(rateLimited ? { outcomeRef: "rate_limited" } : {}),
      receivedAt: args.receivedAt,
      ...(rateLimited ? { processedAt: args.receivedAt } : {}),
    });

    if (rateLimited) {
      return {
        duplicate: false,
        rateLimited: true,
        outcomeRef: "rate_limited",
      };
    }

    const contact = await ctx.db
      .query("conversationContacts")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .unique();

    if (contact === null) {
      await ctx.db.insert("conversationContacts", {
        conversationId: args.conversationId,
        connectionId: args.connectionId,
        channel: args.channel,
        senderFingerprint: args.senderFingerprint,
        firstSeenAt: args.receivedAt,
        lastSeenAt: args.receivedAt,
      });
    } else {
      await ctx.db.patch(contact._id, {
        connectionId: args.connectionId,
        channel: args.channel,
        senderFingerprint: args.senderFingerprint,
        lastSeenAt: args.receivedAt,
      });
    }

    return { duplicate: false, rateLimited: false, outcomeRef: null };
  },
});

export const complete = mutation({
  args: {
    messageId: v.string(),
    outcomeRef: v.string(),
    processedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("inboundEvents")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();
    if (event === null) return false;
    await ctx.db.patch(event._id, {
      status: "processed",
      outcomeRef: args.outcomeRef,
      processedAt: args.processedAt,
    });
    return true;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("inboundEvents").collect();
    const contacts = await ctx.db.query("conversationContacts").collect();
    return {
      inboundCount: events.length,
      processedCount: events.filter(({ status }) => status === "processed")
        .length,
      duplicateSafeRecords: new Set(events.map(({ messageId }) => messageId))
        .size,
      duplicateCount: events.reduce(
        (sum, event) => sum + (event.duplicateCount ?? 0),
        0,
      ),
      contactChannels: [
        ...new Set(contacts.map(({ channel }) => channel)),
      ].sort(),
    };
  },
});
