import type { GenericMutationCtx } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { requireOperatorSecret } from "./auth";
import {
  blocksForInject,
  roleDefinitions,
  seedScenarioState,
  type CanonicalRole,
} from "./scenarioData";

const roleKeyValidator = v.union(
  v.literal("field"),
  v.literal("control"),
  v.literal("director"),
);

type MutationCtx = GenericMutationCtx<DataModel>;

async function abortSession(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  input: {
    now: number;
    actorType: "participant" | "operator";
    roleId?: Id<"roles">;
  },
): Promise<{ aborted: boolean }> {
  if (["completed", "aborted", "failed"].includes(session.status)) {
    return { aborted: session.status === "aborted" };
  }
  await ctx.db.patch(session._id, {
    status: "aborted",
    pausedFrom: undefined,
    pausedAt: undefined,
    pauseReason: undefined,
    version: session.version + 1,
    completedAt: input.now,
    updatedAt: input.now,
  });
  const [injects, deliveries, roles] = await Promise.all([
    ctx.db
      .query("injects")
      .withIndex("by_session_inject_key", (q) => q.eq("sessionId", session._id))
      .collect(),
    ctx.db.query("deliveries").collect(),
    ctx.db
      .query("roles")
      .withIndex("by_session_role", (q) => q.eq("sessionId", session._id))
      .collect(),
  ]);
  for (const inject of injects) {
    if (
      ["planned", "queued", "sent", "delivered", "open", "retrying"].includes(
        inject.status,
      )
    ) {
      await ctx.db.patch(inject._id, {
        status: "cancelled",
        version: inject.version + 1,
        updatedAt: input.now,
      });
    }
  }
  for (const delivery of deliveries) {
    if (
      delivery.sessionId === session._id &&
      ["pending", "claimed"].includes(delivery.status)
    ) {
      await ctx.db.patch(delivery._id, {
        status: "cancelled",
        updatedAt: input.now,
      });
    }
  }
  for (const role of roles) {
    await ctx.db.patch(role._id, {
      currentInjectId: undefined,
      status: "completed",
      version: role.version + 1,
      updatedAt: input.now,
    });
  }
  await ctx.db.insert("auditEvents", {
    sessionId: session._id,
    ...(input.roleId === undefined ? {} : { roleId: input.roleId }),
    type: "session.aborted",
    actorType: input.actorType,
    safeMetadata: {},
    createdAt: input.now,
  });
  return { aborted: true };
}

export const createDemo = mutation({
  args: {
    operatorSecret: v.string(),
    demoTenant: v.string(),
    publicCode: v.string(),
    roleCodes: v.array(
      v.object({
        roleKey: roleKeyValidator,
        joinCodeHash: v.string(),
        joinCodeExpiresAt: v.number(),
      }),
    ),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    if (new Set(args.roleCodes.map(({ roleKey }) => roleKey)).size !== 3) {
      throw new ConvexError("Exactly one code per canonical role is required");
    }
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_public_code", (q) => q.eq("publicCode", args.publicCode))
      .first();
    if (existing !== null) throw new ConvexError("Session code already exists");

    const sessionId = await ctx.db.insert("sessions", {
      scenarioId: "asteria-bay3-v1",
      publicCode: args.publicCode,
      status: "draft",
      version: 1,
      demoTenant: args.demoTenant,
      createdAt: args.now,
      updatedAt: args.now,
    });
    const roleIds = {} as Record<CanonicalRole, Id<"roles">>;
    for (const roleCode of args.roleCodes) {
      const definition = roleDefinitions[roleCode.roleKey];
      roleIds[roleCode.roleKey] = await ctx.db.insert("roles", {
        sessionId,
        roleKey: roleCode.roleKey,
        displayName: definition.displayName,
        publicAlias: definition.publicAlias,
        joinCodeHash: roleCode.joinCodeHash,
        joinCodeExpiresAt: roleCode.joinCodeExpiresAt,
        status: "unassigned",
        version: 1,
        createdAt: args.now,
        updatedAt: args.now,
      });
    }
    await seedScenarioState(ctx, sessionId, roleIds, args.now);
    await ctx.db.insert("auditEvents", {
      sessionId,
      type: "session.created",
      actorType: "operator",
      safeMetadata: { publicCode: args.publicCode },
      createdAt: args.now,
    });
    return sessionId;
  },
});

export const start = mutation({
  args: {
    operatorSecret: v.string(),
    sessionId: v.id("sessions"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    const session = await ctx.db.get(args.sessionId);
    if (session === null || session.status !== "ready") {
      throw new ConvexError("Session is not ready");
    }
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_session_role", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    if (roles.length !== 3 || roles.some(({ status }) => status !== "joined")) {
      throw new ConvexError("All roles must join before start");
    }

    for (const injectKey of ["F1", "D1"] as const) {
      const inject = await ctx.db
        .query("injects")
        .withIndex("by_session_inject_key", (q) =>
          q.eq("sessionId", args.sessionId).eq("injectKey", injectKey),
        )
        .unique();
      if (inject === null) throw new ConvexError(`Missing inject ${injectKey}`);
      const role = roles.find(({ _id }) => _id === inject.roleId);
      if (role === undefined) throw new ConvexError("Inject role missing");
      const endpoint = await ctx.db
        .query("endpoints")
        .withIndex("by_role_active", (q) =>
          q.eq("roleId", role._id).eq("active", true),
        )
        .unique();
      if (endpoint === null) throw new ConvexError("Role endpoint missing");
      await ctx.db.patch(inject._id, {
        status: "queued",
        version: inject.version + 1,
        updatedAt: args.now,
      });
      await ctx.db.patch(role._id, {
        currentInjectId: inject._id,
        status: "active",
        version: role.version + 1,
        updatedAt: args.now,
      });
      await ctx.db.insert("deliveries", {
        idempotencyKey: `inject:${inject._id}:role:${role._id}`,
        sessionId: args.sessionId,
        roleId: role._id,
        injectId: inject._id,
        semanticType: "scenario.inject",
        conversationId: endpoint.conversationId,
        channel: endpoint.channel,
        payload: {
          text: inject.exerciseText,
          blocks: blocksForInject(inject),
          ...(inject.emailSubject === undefined
            ? {}
            : {
                html: `<p>${inject.exerciseText.replaceAll("\n", "<br>")}</p>`,
              }),
        },
        status: "pending",
        attempts: 0,
        nextAttemptAt: args.now,
        createdAt: args.now,
        updatedAt: args.now,
      });
    }
    await ctx.db.patch(args.sessionId, {
      status: "running",
      pausedFrom: undefined,
      pausedAt: undefined,
      pauseReason: undefined,
      version: session.version + 1,
      startedAt: args.now,
      updatedAt: args.now,
    });
    return { status: "running" as const };
  },
});

export const control = mutation({
  args: {
    operatorSecret: v.string(),
    sessionId: v.id("sessions"),
    action: v.union(
      v.literal("pause"),
      v.literal("resume"),
      v.literal("abort"),
    ),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    const session = await ctx.db.get(args.sessionId);
    if (session === null) throw new ConvexError("Session not found");

    if (args.action === "abort") {
      return await abortSession(ctx, session, {
        now: args.now,
        actorType: "operator",
      });
    }

    if (args.action === "pause") {
      if (session.status !== "running" && session.status !== "resolving") {
        throw new ConvexError("Only an active session can be paused");
      }
      const pausedFrom = session.status;
      await ctx.db.patch(session._id, {
        status: "paused",
        pausedFrom,
        pausedAt: args.now,
        pauseReason: "operator",
        version: session.version + 1,
        updatedAt: args.now,
      });
      await ctx.db.insert("auditEvents", {
        sessionId: session._id,
        type: "session.paused",
        actorType: "operator",
        safeMetadata: { pausedFrom },
        createdAt: args.now,
      });
      return { status: "paused" as const };
    }

    if (session.status !== "paused" || session.pauseReason !== "operator") {
      throw new ConvexError(
        "Only an operator-paused session can be resumed; safety pauses require reset",
      );
    }
    const resumedStatus = session.pausedFrom ?? "running";
    const pauseDurationMs = Math.max(
      0,
      args.now - (session.pausedAt ?? args.now),
    );
    const injects = await ctx.db
      .query("injects")
      .withIndex("by_session_inject_key", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const inject of injects) {
      if (inject.status === "open" && inject.deadlineAt !== undefined) {
        await ctx.db.patch(inject._id, {
          deadlineAt: inject.deadlineAt + pauseDurationMs,
          version: inject.version + 1,
          updatedAt: args.now,
        });
      }
    }
    await ctx.db.patch(session._id, {
      status: resumedStatus,
      pausedFrom: undefined,
      pausedAt: undefined,
      pauseReason: undefined,
      version: session.version + 1,
      updatedAt: args.now,
    });
    await ctx.db.insert("auditEvents", {
      sessionId: session._id,
      type: "session.resumed",
      actorType: "operator",
      safeMetadata: { resumedStatus, pauseDurationMs },
      createdAt: args.now,
    });
    return { status: resumedStatus };
  },
});

export const publicSummary = query({
  args: { publicCode: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_public_code", (q) => q.eq("publicCode", args.publicCode))
      .first();
    if (session === null) return null;
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_session_role", (q) => q.eq("sessionId", session._id))
      .collect();
    return {
      scenarioId: session.scenarioId,
      publicCode: session.publicCode,
      status: session.status,
      roles: roles.map(({ roleKey, displayName, publicAlias, status }) => ({
        roleKey,
        displayName,
        publicAlias,
        status,
      })),
    };
  },
});

export const operatorCurrent = query({
  args: { operatorSecret: v.string(), demoTenant: v.string() },
  handler: async (ctx, args) => {
    requireOperatorSecret(args.operatorSecret);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_tenant_status", (q) => q.eq("demoTenant", args.demoTenant))
      .order("desc")
      .first();
    if (session === null) return null;
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_session_role", (q) => q.eq("sessionId", session._id))
      .collect();
    return {
      sessionId: session._id,
      publicCode: session.publicCode,
      status: session.status,
      pauseReason: session.pauseReason ?? null,
      roles: roles.map(({ roleKey, status }) => ({ roleKey, status })),
    };
  },
});

export const abortByConversation = mutation({
  args: { conversationId: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const endpoint = await ctx.db
      .query("endpoints")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (endpoint === null || !endpoint.active) return { aborted: false };
    const session = await ctx.db.get(endpoint.sessionId);
    if (session === null) return { aborted: false };
    return await abortSession(ctx, session, {
      now: args.now,
      actorType: "participant",
      roleId: endpoint.roleId,
    });
  },
});
