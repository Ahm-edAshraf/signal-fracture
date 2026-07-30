import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireOperatorSecret } from "./auth";

export const demoTenant = mutation({
  args: { operatorSecret: v.string(), demoTenant: v.string() },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    const sessions = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("demoTenant"), args.demoTenant))
      .collect();
    const ids = new Set(sessions.map(({ _id }) => _id));
    const tables = [
      "reports",
      "auditEvents",
      "deliveries",
      "inboundEvents",
      "contradictions",
      "decisions",
      "injects",
      "roleKnowledge",
      "worldFacts",
      "endpoints",
      "roles",
    ] as const;
    let deleted = 0;
    for (const table of tables) {
      const documents = await ctx.db.query(table).collect();
      for (const document of documents) {
        if (
          "sessionId" in document &&
          document.sessionId !== undefined &&
          ids.has(document.sessionId)
        ) {
          await ctx.db.delete(document._id);
          deleted += 1;
        }
      }
    }
    for (const session of sessions) {
      await ctx.db.delete(session._id);
      deleted += 1;
    }
    return { deletedSessions: sessions.length, deletedDocuments: deleted };
  },
});
