import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireOperatorSecret } from "./auth";
import { queueScenarioInject } from "./scenarioData";

export const sweep = mutation({
  args: { operatorSecret: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    const openInjects = await ctx.db
      .query("injects")
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();
    openInjects.sort(
      (left, right) =>
        (left.deadlineAt ?? Number.POSITIVE_INFINITY) -
          (right.deadlineAt ?? Number.POSITIVE_INFINITY) ||
        left.injectKey.localeCompare(right.injectKey),
    );
    const expiredKeys: string[] = [];
    for (const inject of openInjects) {
      if (inject.deadlineAt === undefined || inject.deadlineAt > args.now) {
        continue;
      }
      const [session, role] = await Promise.all([
        ctx.db.get(inject.sessionId),
        ctx.db.get(inject.roleId),
      ]);
      if (
        session === null ||
        role === null ||
        (session.status !== "running" && session.status !== "resolving")
      ) {
        continue;
      }
      await ctx.db.patch(inject._id, {
        status: "expired",
        closesAt: args.now,
        version: inject.version + 1,
        updatedAt: args.now,
      });
      if (role.currentInjectId === inject._id) {
        await ctx.db.patch(role._id, {
          currentInjectId: undefined,
          version: role.version + 1,
          updatedAt: args.now,
        });
      }
      await ctx.db.insert("auditEvents", {
        sessionId: session._id,
        roleId: role._id,
        injectId: inject._id,
        type: "inject.expired",
        actorType: "system",
        safeMetadata: { injectKey: inject.injectKey },
        createdAt: args.now,
      });
      expiredKeys.push(inject.injectKey);

      if (inject.injectKey === "F1") {
        await queueScenarioInject(ctx, session._id, "C1", args.now);
      } else {
        await ctx.db.patch(session._id, {
          status: "paused",
          pausedFrom: session.status,
          pausedAt: args.now,
          pauseReason: "deadline",
          version: session.version + 1,
          updatedAt: args.now,
        });
        await ctx.db.insert("auditEvents", {
          sessionId: session._id,
          injectId: inject._id,
          type: "session.paused",
          actorType: "system",
          safeMetadata: { reason: "deadline", injectKey: inject.injectKey },
          createdAt: args.now,
        });
      }
    }
    return { expiredCount: expiredKeys.length, expiredKeys };
  },
});
