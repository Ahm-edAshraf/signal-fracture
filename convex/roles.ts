import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { roleDefinitions } from "./scenarioData";

const roleKeyValidator = v.union(
  v.literal("field"),
  v.literal("control"),
  v.literal("director"),
);

export const join = mutation({
  args: {
    publicCode: v.string(),
    roleKey: roleKeyValidator,
    joinCodeHash: v.string(),
    conversationId: v.string(),
    connectionId: v.string(),
    channel: v.string(),
    senderFingerprint: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_public_code", (q) => q.eq("publicCode", args.publicCode))
      .first();
    if (session === null || !["draft", "ready"].includes(session.status)) {
      throw new ConvexError("Session is not accepting joins");
    }
    const role = await ctx.db
      .query("roles")
      .withIndex("by_session_role", (q) =>
        q.eq("sessionId", session._id).eq("roleKey", args.roleKey),
      )
      .unique();
    if (
      role === null ||
      role.joinCodeHash !== args.joinCodeHash ||
      role.joinCodeExpiresAt <= args.now
    ) {
      throw new ConvexError("Invalid or expired role code");
    }
    const expectedChannel = roleDefinitions[args.roleKey].channel;
    if (args.channel !== expectedChannel) {
      throw new ConvexError(`This role joins through ${expectedChannel}`);
    }
    const boundConversation = await ctx.db
      .query("endpoints")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (boundConversation !== null) {
      if (boundConversation.roleId === role._id && boundConversation.active) {
        return { status: "already_joined" as const, roleId: role._id };
      }
      throw new ConvexError("Conversation is already bound to another role");
    }
    if (role.status !== "unassigned") {
      throw new ConvexError("Role code has already been used");
    }
    await ctx.db.insert("endpoints", {
      sessionId: session._id,
      roleId: role._id,
      channel: args.channel,
      conversationId: args.conversationId,
      connectionId: args.connectionId,
      senderFingerprint: args.senderFingerprint,
      active: true,
      joinedAt: args.now,
      lastSeenAt: args.now,
    });
    await ctx.db.patch(role._id, {
      status: "joined",
      version: role.version + 1,
      updatedAt: args.now,
    });
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_session_role", (q) => q.eq("sessionId", session._id))
      .collect();
    const allJoined = roles.every(
      (candidate) =>
        candidate._id === role._id || candidate.status === "joined",
    );
    if (allJoined) {
      await ctx.db.patch(session._id, {
        status: "ready",
        version: session.version + 1,
        updatedAt: args.now,
      });
    }
    await ctx.db.insert("auditEvents", {
      sessionId: session._id,
      roleId: role._id,
      type: "role.joined",
      actorType: "participant",
      safeMetadata: { roleKey: args.roleKey, channel: args.channel },
      createdAt: args.now,
    });
    return { status: "joined" as const, roleId: role._id };
  },
});

export const statusForConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const endpoint = await ctx.db
      .query("endpoints")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (endpoint === null || !endpoint.active) return null;
    const [role, session, knowledge] = await Promise.all([
      ctx.db.get(endpoint.roleId),
      ctx.db.get(endpoint.sessionId),
      ctx.db
        .query("roleKnowledge")
        .withIndex("by_role_fact_learned", (q) =>
          q.eq("roleId", endpoint.roleId),
        )
        .collect(),
    ]);
    if (role === null || session === null) return null;
    const latest = new Map<string, (typeof knowledge)[number]>();
    for (const fact of knowledge) latest.set(fact.factKey, fact);
    return {
      sessionStatus: session.status,
      roleKey: role.roleKey,
      publicAlias: role.publicAlias,
      currentInjectId: role.currentInjectId ?? null,
      knownFacts: [...latest.values()].map(
        ({ factKey, observedValue, learnedAt, stale }) => ({
          factKey,
          observedValue,
          learnedAt,
          stale,
        }),
      ),
    };
  },
});
