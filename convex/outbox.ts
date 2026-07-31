import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { deadlineForInject } from "./scenarioData";

export const claimNext = mutation({
  args: { now: v.number(), workerId: v.string() },
  handler: async (ctx, args) => {
    const due = await ctx.db
      .query("deliveries")
      .withIndex("by_status_next_attempt", (q) =>
        q.eq("status", "pending").lte("nextAttemptAt", args.now),
      )
      .take(50);
    let item: (typeof due)[number] | null = null;
    for (const candidate of due) {
      const session = await ctx.db.get(candidate.sessionId);
      if (
        session !== null &&
        ["running", "resolving"].includes(session.status)
      ) {
        item = candidate;
        break;
      }
    }
    if (item === null) return null;
    await ctx.db.patch(item._id, {
      status: "claimed",
      attempts: item.attempts + 1,
      claimedAt: args.now,
      updatedAt: args.now,
      lastErrorCode: `claimed:${args.workerId}`,
    });
    return { ...item, status: "claimed" as const, attempts: item.attempts + 1 };
  },
});

export const markSent = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    providerMessageId: v.optional(v.string()),
    latencyMs: v.number(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (delivery?.status === "cancelled") return false;
    if (delivery?.status === "sent") return true;
    if (delivery === null || delivery.status !== "claimed") {
      throw new ConvexError("Delivery is not claimed");
    }
    await ctx.db.patch(delivery._id, {
      status: "sent",
      ...(args.providerMessageId === undefined
        ? {}
        : { providerMessageId: args.providerMessageId }),
      lastErrorCode: undefined,
      latencyMs: args.latencyMs,
      updatedAt: args.now,
    });
    if (delivery.injectId !== undefined) {
      const inject = await ctx.db.get(delivery.injectId);
      if (inject !== null) {
        await ctx.db.patch(inject._id, {
          status: "open",
          opensAt: args.now,
          deadlineAt: args.now + deadlineForInject(inject.injectKey),
          version: inject.version + 1,
          updatedAt: args.now,
        });
      }
    }
    return true;
  },
});

export const requeueStaleClaims = mutation({
  args: { staleBefore: v.number(), now: v.number(), maxAttempts: v.number() },
  handler: async (ctx, args) => {
    const claimed = await ctx.db
      .query("deliveries")
      .withIndex("by_status_next_attempt", (q) => q.eq("status", "claimed"))
      .collect();
    let requeued = 0;
    let failed = 0;
    for (const delivery of claimed) {
      if (
        delivery.claimedAt === undefined ||
        delivery.claimedAt > args.staleBefore
      ) {
        continue;
      }
      const permanent = delivery.attempts >= args.maxAttempts;
      await ctx.db.patch(delivery._id, {
        status: permanent ? "failed" : "pending",
        nextAttemptAt: args.now,
        lastErrorCode: "worker_restart_recovery",
        updatedAt: args.now,
      });
      if (permanent) {
        const session = await ctx.db.get(delivery.sessionId);
        if (
          session !== null &&
          (session.status === "running" || session.status === "resolving")
        ) {
          await ctx.db.patch(session._id, {
            status: "paused",
            pausedFrom: session.status,
            pausedAt: args.now,
            pauseReason: "delivery_failure",
            version: session.version + 1,
            updatedAt: args.now,
          });
          await ctx.db.insert("auditEvents", {
            sessionId: session._id,
            deliveryId: delivery._id,
            type: "session.paused",
            actorType: "system",
            safeMetadata: {
              reason: "delivery_failure",
              channel: delivery.channel,
            },
            createdAt: args.now,
          });
        }
        if (delivery.injectId !== undefined) {
          const inject = await ctx.db.get(delivery.injectId);
          if (inject !== null) {
            await ctx.db.patch(inject._id, {
              status: "failed",
              version: inject.version + 1,
              updatedAt: args.now,
            });
          }
        }
        failed += 1;
      } else {
        requeued += 1;
      }
    }
    return { requeued, failed };
  },
});

export const markFailed = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    errorCode: v.string(),
    now: v.number(),
    maxAttempts: v.number(),
    retryAt: v.number(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (delivery?.status === "cancelled") {
      return { permanent: true, cancelled: true };
    }
    if (delivery === null || delivery.status !== "claimed") {
      throw new ConvexError("Delivery is not claimed");
    }
    const permanent = delivery.attempts >= args.maxAttempts;
    await ctx.db.patch(delivery._id, {
      status: permanent ? "failed" : "pending",
      nextAttemptAt: permanent ? delivery.nextAttemptAt : args.retryAt,
      lastErrorCode: args.errorCode,
      updatedAt: args.now,
    });
    if (permanent) {
      const session = await ctx.db.get(delivery.sessionId);
      if (
        session !== null &&
        (session.status === "running" || session.status === "resolving")
      ) {
        await ctx.db.patch(session._id, {
          status: "paused",
          pausedFrom: session.status,
          pausedAt: args.now,
          pauseReason: "delivery_failure",
          version: session.version + 1,
          updatedAt: args.now,
        });
        await ctx.db.insert("auditEvents", {
          sessionId: session._id,
          deliveryId: delivery._id,
          type: "session.paused",
          actorType: "system",
          safeMetadata: {
            reason: "delivery_failure",
            channel: delivery.channel,
          },
          createdAt: args.now,
        });
      }
      if (delivery.injectId !== undefined) {
        const inject = await ctx.db.get(delivery.injectId);
        if (inject !== null) {
          await ctx.db.patch(inject._id, {
            status: "failed",
            version: inject.version + 1,
            updatedAt: args.now,
          });
        }
      }
    }
    return { permanent };
  },
});
