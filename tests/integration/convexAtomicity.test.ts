/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
const operatorSecret = "integration-test-operator-secret";

function roleCodes() {
  return [
    {
      roleKey: "field" as const,
      joinCodeHash: "field-code-hash",
      joinCodeExpiresAt: 10_000,
    },
    {
      roleKey: "control" as const,
      joinCodeHash: "control-code-hash",
      joinCodeExpiresAt: 10_000,
    },
    {
      roleKey: "director" as const,
      joinCodeHash: "director-code-hash",
      joinCodeExpiresAt: 10_000,
    },
  ];
}

describe("Convex atomic state", () => {
  beforeEach(() => {
    process.env.OPERATOR_SECRET = operatorSecret;
  });

  it("claims an inbound event once and advances checkpoints monotonically", async () => {
    const t = convexTest(schema, modules);
    const input = {
      caspianEventId: "event-1",
      messageId: "message-1",
      conversationId: "conversation-1",
      conversationIdHash: "conversation-hash",
      connectionId: "connection-1",
      channel: "email",
      senderFingerprint: "sender-hash",
      receivedAt: 100,
    };
    await expect(t.mutation(api.inbound.claim, input)).resolves.toMatchObject({
      duplicate: false,
    });
    await expect(t.mutation(api.inbound.claim, input)).resolves.toMatchObject({
      duplicate: true,
    });
    expect(await t.query(api.inbound.stats)).toMatchObject({
      duplicateCount: 1,
    });
    expect(await t.mutation(api.checkpoint.save, { lastSeq: 20 })).toBe(20);
    expect(await t.mutation(api.checkpoint.save, { lastSeq: 10 })).toBe(20);
    expect(await t.query(api.checkpoint.load)).toBe(20);
  });

  it("rate-limits one conversation atomically without losing dedup records", async () => {
    const t = convexTest(schema, modules);
    for (let index = 0; index < 21; index += 1) {
      const result = await t.mutation(api.inbound.claim, {
        caspianEventId: `event-${index}`,
        messageId: `message-${index}`,
        conversationId: "noisy-conversation",
        conversationIdHash: "noisy-conversation-hash",
        connectionId: "connection",
        channel: "telegram",
        senderFingerprint: "sender-hash",
        receivedAt: 1_000 + index,
      });
      expect(result.rateLimited).toBe(index >= 20);
    }
    expect(await t.query(api.inbound.stats)).toMatchObject({
      inboundCount: 21,
      duplicateSafeRecords: 21,
      processedCount: 1,
    });
  });

  it("binds each signed-code hash to one canonical role and keeps STATUS private", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.sessions.createDemo, {
      operatorSecret,
      demoTenant: "tenant-a",
      publicCode: "ASTERIA",
      roleCodes: roleCodes(),
      now: 0,
    });
    await t.mutation(api.roles.join, {
      publicCode: "ASTERIA",
      roleKey: "field",
      joinCodeHash: "field-code-hash",
      conversationId: "telegram-field",
      connectionId: "telegram-connection",
      channel: "telegram",
      senderFingerprint: "field-fingerprint",
      now: 100,
    });

    await expect(
      t.mutation(api.roles.join, {
        publicCode: "ASTERIA",
        roleKey: "field",
        joinCodeHash: "field-code-hash",
        conversationId: "telegram-attacker",
        connectionId: "telegram-connection",
        channel: "telegram",
        senderFingerprint: "attacker-fingerprint",
        now: 101,
      }),
    ).rejects.toThrow();

    const status = await t.query(api.roles.statusForConversation, {
      conversationId: "telegram-field",
    });
    expect(status?.roleKey).toBe("field");
    expect(status?.knownFacts).toEqual([]);
  });

  it("starts only after all roles join and claims each outbox item once", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.createDemo, {
      operatorSecret,
      demoTenant: "tenant-a",
      publicCode: "ASTERIA",
      roleCodes: roleCodes(),
      now: 0,
    });
    const joins = [
      ["field", "field-code-hash", "telegram", "field-conversation"],
      ["control", "control-code-hash", "discord", "control-conversation"],
      ["director", "director-code-hash", "email", "director-conversation"],
    ] as const;
    for (const [roleKey, joinCodeHash, channel, conversationId] of joins) {
      await t.mutation(api.roles.join, {
        publicCode: "ASTERIA",
        roleKey,
        joinCodeHash,
        conversationId,
        connectionId: `${channel}-connection`,
        channel,
        senderFingerprint: `${roleKey}-fingerprint`,
        now: 100,
      });
    }
    await expect(
      t.mutation(api.sessions.start, {
        operatorSecret,
        sessionId,
        now: 200,
      }),
    ).resolves.toEqual({ status: "running" });
    await expect(
      t.mutation(api.sessions.start, {
        operatorSecret,
        sessionId,
        now: 201,
      }),
    ).rejects.toThrow();

    const [first, second, third] = await Promise.all([
      t.mutation(api.outbox.claimNext, { now: 200, workerId: "worker-a" }),
      t.mutation(api.outbox.claimNext, { now: 200, workerId: "worker-b" }),
      t.mutation(api.outbox.claimNext, { now: 200, workerId: "worker-c" }),
    ]);
    const claimed = [first, second, third].filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
    expect(claimed).toHaveLength(2);
    expect(new Set(claimed.map(({ _id }) => _id)).size).toBe(2);
    expect(
      new Set(claimed.map(({ idempotencyKey }) => idempotencyKey)).size,
    ).toBe(2);
    const acknowledged = claimed[0];
    if (acknowledged === undefined) throw new Error("Expected delivery");
    await expect(
      t.mutation(api.outbox.markSent, {
        deliveryId: acknowledged._id,
        latencyMs: 10,
        now: 300,
      }),
    ).resolves.toBe(true);
    await expect(
      t.mutation(api.outbox.markSent, {
        deliveryId: acknowledged._id,
        latencyMs: 999,
        now: 400,
      }),
    ).resolves.toBe(true);
    const acknowledgedInject = await t.run(async (ctx) =>
      acknowledged.injectId === undefined
        ? null
        : await ctx.db.get(acknowledged.injectId),
    );
    expect(acknowledgedInject?.opensAt).toBe(300);
  });

  it("pauses the branch after bounded permanent delivery failure", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("sessions", {
        scenarioId: "asteria-bay3-v1",
        publicCode: "FAILURE",
        status: "running",
        version: 1,
        demoTenant: "tenant-a",
        createdAt: 0,
        updatedAt: 0,
      });
      const roleId = await ctx.db.insert("roles", {
        sessionId: id,
        roleKey: "field",
        displayName: "Field Engineer",
        publicAlias: "FE-1",
        joinCodeHash: "hash",
        joinCodeExpiresAt: 10_000,
        status: "active",
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.insert("deliveries", {
        idempotencyKey: "inject:failure:field",
        sessionId: id,
        roleId,
        semanticType: "scenario.inject",
        conversationId: "conversation",
        channel: "telegram",
        payload: { text: "safe synthetic test" },
        status: "pending",
        attempts: 0,
        nextAttemptAt: 0,
        createdAt: 0,
        updatedAt: 0,
      });
      return id;
    });
    const delivery = await t.mutation(api.outbox.claimNext, {
      now: 1,
      workerId: "worker",
    });
    if (delivery === null) throw new Error("Expected delivery");
    await expect(
      t.mutation(api.outbox.markFailed, {
        deliveryId: delivery._id,
        errorCode: "transport_failure",
        now: 2,
        maxAttempts: 3,
        retryAt: 100,
      }),
    ).resolves.toEqual({ permanent: false });
    expect(
      await t.mutation(api.outbox.claimNext, { now: 99, workerId: "worker" }),
    ).toBeNull();
    const second = await t.mutation(api.outbox.claimNext, {
      now: 100,
      workerId: "worker",
    });
    if (second === null) throw new Error("Expected second attempt");
    await expect(
      t.mutation(api.outbox.markFailed, {
        deliveryId: second._id,
        errorCode: "transport_failure",
        now: 101,
        maxAttempts: 3,
        retryAt: 200,
      }),
    ).resolves.toEqual({ permanent: false });
    const third = await t.mutation(api.outbox.claimNext, {
      now: 200,
      workerId: "worker",
    });
    if (third === null) throw new Error("Expected third attempt");
    await expect(
      t.mutation(api.outbox.markFailed, {
        deliveryId: third._id,
        errorCode: "transport_failure",
        now: 201,
        maxAttempts: 3,
        retryAt: 300,
      }),
    ).resolves.toEqual({ permanent: true });
    const { session, audits } = await t.run(async (ctx) => ({
      session: await ctx.db.get(sessionId),
      audits: await ctx.db
        .query("auditEvents")
        .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
        .collect(),
    }));
    expect(session).toMatchObject({
      status: "paused",
      pauseReason: "delivery_failure",
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      type: "session.paused",
      actorType: "system",
      safeMetadata: { reason: "delivery_failure", channel: "telegram" },
    });
  });

  it("pauses the branch when restart recovery exhausts a claimed delivery", async () => {
    const t = convexTest(schema, modules);
    const { sessionId, injectId } = await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert("sessions", {
        scenarioId: "asteria-bay3-v1",
        publicCode: "RESTART",
        status: "running",
        version: 1,
        demoTenant: "tenant-restart",
        createdAt: 0,
        updatedAt: 0,
      });
      const roleId = await ctx.db.insert("roles", {
        sessionId,
        roleKey: "field",
        displayName: "Field Engineer",
        publicAlias: "FE-1",
        joinCodeHash: "hash",
        joinCodeExpiresAt: 10_000,
        status: "active",
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      const injectId = await ctx.db.insert("injects", {
        sessionId,
        injectKey: "F1",
        roleId,
        status: "open",
        exerciseText: "safe synthetic test",
        allowedDecisions: ["SEAL_BAY_3"],
        prerequisiteKeys: [],
        clarificationCount: 0,
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.insert("deliveries", {
        idempotencyKey: "inject:restart:field",
        sessionId,
        roleId,
        injectId,
        semanticType: "scenario.inject",
        conversationId: "conversation",
        channel: "telegram",
        payload: { text: "safe synthetic test" },
        status: "claimed",
        attempts: 3,
        nextAttemptAt: 0,
        claimedAt: 1,
        createdAt: 0,
        updatedAt: 1,
      });
      return { sessionId, injectId };
    });

    await expect(
      t.mutation(api.outbox.requeueStaleClaims, {
        staleBefore: 2,
        now: 3,
        maxAttempts: 3,
      }),
    ).resolves.toEqual({ requeued: 0, failed: 1 });

    const { session, inject } = await t.run(async (ctx) => ({
      session: await ctx.db.get(sessionId),
      inject: await ctx.db.get(injectId),
    }));
    expect(session).toMatchObject({
      status: "paused",
      pauseReason: "delivery_failure",
    });
    expect(inject?.status).toBe("failed");
  });

  it("runs the canonical scenario atomically from injects to one resolved contradiction", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.createDemo, {
      operatorSecret,
      demoTenant: "tenant-canonical",
      publicCode: "ASTERIA",
      roleCodes: roleCodes(),
      now: 0,
    });
    const joins = [
      ["field", "field-code-hash", "telegram", "field-conversation"],
      ["control", "control-code-hash", "discord", "control-conversation"],
      ["director", "director-code-hash", "email", "director-conversation"],
    ] as const;
    for (const [roleKey, joinCodeHash, channel, conversationId] of joins) {
      await t.mutation(api.roles.join, {
        publicCode: "ASTERIA",
        roleKey,
        joinCodeHash,
        conversationId,
        connectionId: `${channel}-connection`,
        channel,
        senderFingerprint: `${roleKey}-fingerprint`,
        now: 100,
      });
    }
    await t.mutation(api.sessions.start, {
      operatorSecret,
      sessionId,
      now: 200,
    });

    async function deliverAll(now: number) {
      let count = 0;
      while (true) {
        const delivery = await t.mutation(api.outbox.claimNext, {
          now,
          workerId: "integration-worker",
        });
        if (delivery === null) return count;
        await t.mutation(api.outbox.markSent, {
          deliveryId: delivery._id,
          providerMessageId: `provider-${delivery._id}`,
          latencyMs: 5,
          now,
        });
        count += 1;
      }
    }

    expect(await deliverAll(210)).toBe(2);
    await expect(
      t.run(async (ctx) => {
        const knowledge = await ctx.db.query("roleKnowledge").collect();
        return knowledge.filter((item) => item.sessionId === sessionId);
      }),
    ).resolves.toEqual([]);
    const fieldPrompt = await t.query(api.decisions.activePrompt, {
      conversationId: "field-conversation",
    });
    const directorPrompt = await t.query(api.decisions.activePrompt, {
      conversationId: "director-conversation",
    });
    if (fieldPrompt === null || directorPrompt === null) {
      throw new Error("Expected initial prompts");
    }
    await t.mutation(api.decisions.accept, {
      inboundEventId: "field-seal",
      conversationId: "field-conversation",
      injectId: fieldPrompt.injectId,
      expectedInjectVersion: fieldPrompt.version,
      canonicalDecision: "SEAL_BAY_3",
      parseMethod: "command",
      rawTextRedacted: "SEAL BAY 3",
      now: 1_000,
    });
    expect(await deliverAll(1_010)).toBe(1);
    const controlPrompt = await t.query(api.decisions.activePrompt, {
      conversationId: "control-conversation",
    });
    if (controlPrompt === null) throw new Error("Expected Control prompt");
    const conflict = await t.mutation(api.decisions.accept, {
      inboundEventId: "control-route",
      conversationId: "control-conversation",
      injectId: controlPrompt.injectId,
      expectedInjectVersion: controlPrompt.version,
      canonicalDecision: "ROUTE_BAY_3",
      parseMethod: "command",
      rawTextRedacted: "ROUTE BAY 3",
      now: 2_000,
    });
    expect(conflict).toMatchObject({
      outcome: "applied",
      contradictionDetected: true,
    });
    await t.mutation(api.decisions.accept, {
      inboundEventId: "director-wait",
      conversationId: "director-conversation",
      injectId: directorPrompt.injectId,
      expectedInjectVersion: directorPrompt.version,
      canonicalDecision: "WAIT_FOR_CONFIRMATION",
      parseMethod: "command",
      rawTextRedacted: "WAIT FOR CONFIRMATION",
      now: 3_000,
    });
    expect(await deliverAll(3_010)).toBe(3);

    const prompts = await Promise.all(
      ["field", "control", "director"].map(
        async (role) =>
          await t.query(api.decisions.activePrompt, {
            conversationId: `${role}-conversation`,
          }),
      ),
    );
    if (prompts.some((prompt) => prompt === null)) {
      throw new Error("Expected reconciliation prompts");
    }
    const [fieldReconcile, controlReconcile, directorReconcile] = prompts;
    if (
      fieldReconcile === null ||
      controlReconcile === null ||
      directorReconcile === null
    ) {
      throw new Error("Expected reconciliation prompts");
    }
    await t.mutation(api.decisions.accept, {
      inboundEventId: "field-blocked",
      conversationId: "field-conversation",
      injectId: fieldReconcile.injectId,
      expectedInjectVersion: fieldReconcile.version,
      canonicalDecision: "PASSAGE_BLOCKED",
      parseMethod: "command",
      rawTextRedacted: "PASSAGE BLOCKED",
      now: 4_000,
    });
    await t.mutation(api.decisions.accept, {
      inboundEventId: "control-reroute",
      conversationId: "control-conversation",
      injectId: controlReconcile.injectId,
      expectedInjectVersion: controlReconcile.version,
      canonicalDecision: "REROUTE_BAY_5",
      parseMethod: "command",
      rawTextRedacted: "REROUTE BAY 5",
      now: 5_000,
    });
    const completion = await t.mutation(api.decisions.accept, {
      inboundEventId: "director-escalate",
      conversationId: "director-conversation",
      injectId: directorReconcile.injectId,
      expectedInjectVersion: directorReconcile.version,
      canonicalDecision: "ESCALATE_NOW",
      parseMethod: "command",
      rawTextRedacted: "ESCALATE NOW",
      now: 6_000,
    });
    expect(completion).toMatchObject({
      outcome: "applied",
      sessionId,
      sessionCompleted: true,
    });

    const final = await t.run(async (ctx) => {
      const session = await ctx.db.get(sessionId);
      const contradictions = await ctx.db
        .query("contradictions")
        .withIndex("by_session_key", (q) => q.eq("sessionId", sessionId))
        .collect();
      const facts = await ctx.db
        .query("worldFacts")
        .withIndex("by_session_fact_version", (q) =>
          q.eq("sessionId", sessionId),
        )
        .collect();
      return { session, contradictions, facts };
    });
    expect(final.session?.status).toBe("completed");
    expect(final.contradictions).toHaveLength(1);
    expect(final.contradictions[0]?.status).toBe("resolved");
    expect(
      final.facts
        .filter(({ factKey }) => factKey === "crew7.route")
        .sort((a, b) => b.version - a.version)[0]?.value,
    ).toBe("BAY_5");
    expect(
      final.facts
        .filter(({ factKey }) => factKey === "commander.notified")
        .sort((a, b) => b.version - a.version)[0]?.value,
    ).toBe(true);
    const report = await t.query(api.reports.getPublic, {
      publicCode: "ASTERIA",
    });
    expect(report).toMatchObject({
      status: "completed",
      metrics: {
        coordinationScore: 90,
        contradictionCount: 1,
        fieldToControlConflictMs: 1_000,
        contradictionDetectionMs: 0,
        contradictionResolutionMs: 4_000,
      },
    });
    const confirmedKnowledge = await t.run(async (ctx) => {
      const [knowledge, roles] = await Promise.all([
        ctx.db.query("roleKnowledge").collect(),
        ctx.db
          .query("roles")
          .withIndex("by_session_role", (q) => q.eq("sessionId", sessionId))
          .collect(),
      ]);
      const roleById = new Map(roles.map((role) => [role._id, role.roleKey]));
      return knowledge
        .filter((item) => item.sessionId === sessionId)
        .map((item) => ({
          role: roleById.get(item.roleId),
          factKey: item.factKey,
          observedValue: item.observedValue,
          stale: item.stale,
        }));
    });
    expect(confirmedKnowledge).toEqual(
      expect.arrayContaining([
        {
          role: "control",
          factKey: "bay3.access",
          observedValue: "OPEN",
          stale: true,
        },
        {
          role: "control",
          factKey: "bay3.access",
          observedValue: "SEALED",
          stale: false,
        },
      ]),
    );
    const narrationInput = await t.query(api.reports.getNarrationInput, {
      operatorSecret,
      sessionId,
    });
    if (narrationInput === null) throw new Error("Expected narration input");
    await expect(
      t.mutation(api.reports.attachNarrative, {
        operatorSecret: "invalid-operator-secret",
        reportId: narrationInput.reportId,
        narrative: "Should not be stored.",
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.reports.attachNarrative, {
        operatorSecret,
        reportId: narrationInput.reportId,
        narrative:
          "The deterministic record shows one resolved Bay 3 contradiction.",
      }),
    ).resolves.toBe(true);
    expect(
      await t.query(api.reports.getPublic, { publicCode: "ASTERIA" }),
    ).toMatchObject({
      narrative:
        "The deterministic record shows one resolved Bay 3 contradiction.",
    });
    const dashboard = await t.query(api.dashboard.publicState, {
      publicCode: "ASTERIA",
    });
    expect(dashboard).toMatchObject({
      session: { status: "completed" },
      roles: expect.arrayContaining([
        expect.objectContaining({ roleKey: "field", channel: "telegram" }),
        expect.objectContaining({ roleKey: "control", channel: "discord" }),
        expect.objectContaining({ roleKey: "director", channel: "email" }),
      ]),
      contradictions: [
        expect.objectContaining({
          contradictionKey: "C-BAY3",
          status: "resolved",
        }),
      ],
    });
    const publicJson = JSON.stringify(dashboard);
    expect(publicJson).not.toContain("field-conversation");
    expect(publicJson).not.toContain("field-fingerprint");

    await expect(
      t.mutation(api.decisions.accept, {
        inboundEventId: "field-seal",
        conversationId: "field-conversation",
        injectId: fieldPrompt.injectId,
        expectedInjectVersion: fieldPrompt.version,
        canonicalDecision: "SEAL_BAY_3",
        parseMethod: "command",
        rawTextRedacted: "SEAL BAY 3",
        now: 7_000,
      }),
    ).resolves.toMatchObject({ outcome: "duplicate" });
  });

  it("publishes only safe channel health fields", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.health.record, {
        operatorSecret: "invalid-operator-secret",
        channels: [{ channel: "telegram", status: "active" }],
        checkedAt: 100,
      }),
    ).rejects.toThrow();
    await t.mutation(api.health.record, {
      operatorSecret,
      channels: [
        { channel: "telegram", status: "active" },
        { channel: "discord", status: "active" },
      ],
      checkedAt: 100,
    });
    await expect(t.query(api.health.publicStatus)).resolves.toEqual([
      { channel: "discord", status: "active", checkedAt: 100 },
      { channel: "telegram", status: "active", checkedAt: 100 },
    ]);
  });

  it("guards operator pause, resume, and abort while holding the outbox", async () => {
    const t = convexTest(schema, modules);
    const context = await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert("sessions", {
        scenarioId: "asteria-bay3-v1",
        publicCode: "CONTROLLED",
        status: "running",
        version: 1,
        demoTenant: "operator-control",
        startedAt: 0,
        createdAt: 0,
        updatedAt: 0,
      });
      const roleId = await ctx.db.insert("roles", {
        sessionId,
        roleKey: "field",
        displayName: "Field Engineer",
        publicAlias: "FE-1",
        joinCodeHash: "hash",
        joinCodeExpiresAt: 10_000,
        status: "active",
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      const injectId = await ctx.db.insert("injects", {
        sessionId,
        injectKey: "F1",
        roleId,
        status: "open",
        exerciseText: "synthetic operator control test",
        allowedDecisions: ["SEAL_BAY_3"],
        prerequisiteKeys: [],
        opensAt: 0,
        deadlineAt: 100,
        clarificationCount: 0,
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.patch(roleId, { currentInjectId: injectId });
      await ctx.db.insert("endpoints", {
        sessionId,
        roleId,
        channel: "telegram",
        conversationId: "operator-control-conversation",
        connectionId: "telegram-connection",
        senderFingerprint: "sender-hash",
        active: true,
        joinedAt: 0,
        lastSeenAt: 0,
      });
      const deliveryId = await ctx.db.insert("deliveries", {
        idempotencyKey: "operator-control-delivery",
        sessionId,
        roleId,
        injectId,
        semanticType: "scenario.inject",
        conversationId: "operator-control-conversation",
        channel: "telegram",
        payload: { text: "synthetic operator control test" },
        status: "pending",
        attempts: 0,
        nextAttemptAt: 0,
        createdAt: 0,
        updatedAt: 0,
      });
      return { sessionId, deliveryId };
    });

    await expect(
      t.mutation(api.sessions.control, {
        operatorSecret: "invalid-operator-secret",
        sessionId: context.sessionId,
        action: "pause",
        now: 10,
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.sessions.control, {
        operatorSecret,
        sessionId: context.sessionId,
        action: "pause",
        now: 10,
      }),
    ).resolves.toEqual({ status: "paused" });
    await expect(
      t.mutation(api.outbox.claimNext, { now: 11, workerId: "worker" }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.decisions.activePrompt, {
        conversationId: "operator-control-conversation",
      }),
    ).resolves.toMatchObject({ sessionStatus: "paused" });

    await expect(
      t.mutation(api.sessions.control, {
        operatorSecret,
        sessionId: context.sessionId,
        action: "resume",
        now: 20,
      }),
    ).resolves.toEqual({ status: "running" });
    const resumedSession = await t.run(
      async (ctx) => await ctx.db.get(context.sessionId),
    );
    expect(resumedSession).not.toHaveProperty("pausedAt");
    await expect(
      t.run(async (ctx) => {
        const inject = await ctx.db
          .query("injects")
          .withIndex("by_session_inject_key", (q) =>
            q.eq("sessionId", context.sessionId).eq("injectKey", "F1"),
          )
          .unique();
        return inject?.deadlineAt;
      }),
    ).resolves.toBe(110);
    const claimed = await t.mutation(api.outbox.claimNext, {
      now: 21,
      workerId: "worker",
    });
    expect(claimed?._id).toBe(context.deliveryId);

    await expect(
      t.mutation(api.sessions.control, {
        operatorSecret,
        sessionId: context.sessionId,
        action: "abort",
        now: 22,
      }),
    ).resolves.toEqual({ aborted: true });
    await expect(
      t.mutation(api.outbox.markSent, {
        deliveryId: context.deliveryId,
        latencyMs: 5,
        now: 23,
      }),
    ).resolves.toBe(false);

    const evidence = await t.run(async (ctx) => ({
      session: await ctx.db.get(context.sessionId),
      delivery: await ctx.db.get(context.deliveryId),
      audits: await ctx.db
        .query("auditEvents")
        .withIndex("by_session_created", (q) =>
          q.eq("sessionId", context.sessionId),
        )
        .collect(),
    }));
    expect(evidence.session?.status).toBe("aborted");
    expect(evidence.delivery?.status).toBe("cancelled");
    expect(evidence.audits.map(({ type }) => type)).toEqual([
      "session.paused",
      "session.resumed",
      "session.aborted",
    ]);
    expect(
      evidence.audits.every(({ actorType }) => actorType === "operator"),
    ).toBe(true);
  });

  it("advances F1 after its deterministic deadline and pauses later missed work", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.createDemo, {
      operatorSecret,
      demoTenant: "deadline-test",
      publicCode: "DEADLINE",
      roleCodes: roleCodes(),
      now: 0,
    });
    const joins = [
      ["field", "field-code-hash", "telegram", "deadline-field"],
      ["control", "control-code-hash", "discord", "deadline-control"],
      ["director", "director-code-hash", "email", "deadline-director"],
    ] as const;
    for (const [roleKey, joinCodeHash, channel, conversationId] of joins) {
      await t.mutation(api.roles.join, {
        publicCode: "DEADLINE",
        roleKey,
        joinCodeHash,
        conversationId,
        connectionId: `${channel}-connection`,
        channel,
        senderFingerprint: `${roleKey}-fingerprint`,
        now: 1,
      });
    }
    await t.mutation(api.sessions.start, {
      operatorSecret,
      sessionId,
      now: 2,
    });
    for (let index = 0; index < 2; index += 1) {
      const delivery = await t.mutation(api.outbox.claimNext, {
        now: 2,
        workerId: `deadline-worker-${index}`,
      });
      if (delivery === null) throw new Error("Expected initial delivery");
      await t.mutation(api.outbox.markSent, {
        deliveryId: delivery._id,
        latencyMs: 1,
        now: 100,
      });
    }

    await expect(
      t.mutation(api.deadlines.sweep, {
        operatorSecret: "invalid-operator-secret",
        now: 120_100,
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.deadlines.sweep, {
        operatorSecret,
        now: 120_099,
      }),
    ).resolves.toEqual({ expiredCount: 0, expiredKeys: [] });
    await expect(
      t.mutation(api.deadlines.sweep, {
        operatorSecret,
        now: 120_100,
      }),
    ).resolves.toEqual({ expiredCount: 1, expiredKeys: ["F1"] });
    await expect(
      t.mutation(api.deadlines.sweep, {
        operatorSecret,
        now: 120_100,
      }),
    ).resolves.toEqual({ expiredCount: 0, expiredKeys: [] });

    const directorPrompt = await t.query(api.decisions.activePrompt, {
      conversationId: "deadline-director",
    });
    if (directorPrompt === null) throw new Error("Expected D1 prompt");
    await t.mutation(api.decisions.accept, {
      inboundEventId: "deadline-director-decision",
      conversationId: "deadline-director",
      injectId: directorPrompt.injectId,
      expectedInjectVersion: directorPrompt.version,
      canonicalDecision: "WAIT_FOR_CONFIRMATION",
      parseMethod: "command",
      rawTextRedacted: "WAIT FOR CONFIRMATION",
      now: 120_101,
    });

    const controlDelivery = await t.mutation(api.outbox.claimNext, {
      now: 120_102,
      workerId: "deadline-control-worker",
    });
    if (controlDelivery === null) throw new Error("Expected C1 delivery");
    await t.mutation(api.outbox.markSent, {
      deliveryId: controlDelivery._id,
      latencyMs: 1,
      now: 120_103,
    });
    await expect(
      t.mutation(api.deadlines.sweep, {
        operatorSecret,
        now: 240_103,
      }),
    ).resolves.toEqual({ expiredCount: 1, expiredKeys: ["C1"] });

    const evidence = await t.run(async (ctx) => ({
      session: await ctx.db.get(sessionId),
      injects: await ctx.db
        .query("injects")
        .withIndex("by_session_inject_key", (q) => q.eq("sessionId", sessionId))
        .collect(),
    }));
    expect(evidence.session).toMatchObject({
      status: "paused",
      pauseReason: "deadline",
    });
    expect(
      Object.fromEntries(
        evidence.injects.map(({ injectKey, status }) => [injectKey, status]),
      ),
    ).toMatchObject({ F1: "expired", C1: "expired" });
    await expect(
      t.mutation(api.sessions.control, {
        operatorSecret,
        sessionId,
        action: "resume",
        now: 240_104,
      }),
    ).rejects.toThrow();
  });

  it("resets only the guarded demo tenant", async () => {
    const t = convexTest(schema, modules);
    for (const [demoTenant, publicCode] of [
      ["tenant-reset", "RESET-ME"],
      ["tenant-keep", "KEEP-ME"],
    ] as const) {
      await t.mutation(api.sessions.createDemo, {
        operatorSecret,
        demoTenant,
        publicCode,
        roleCodes: roleCodes(),
        now: 0,
      });
    }
    await t.mutation(api.inbound.claim, {
      caspianEventId: "unbound-event",
      messageId: "unbound-message",
      conversationId: "persisted-contact",
      conversationIdHash: "contact-hash",
      connectionId: "connection",
      channel: "email",
      senderFingerprint: "sender-hash",
      receivedAt: 1,
    });

    await expect(
      t.mutation(api.reset.demoTenant, {
        operatorSecret,
        demoTenant: "tenant-reset",
      }),
    ).resolves.toMatchObject({ deletedSessions: 1 });
    expect(
      await t.query(api.sessions.publicSummary, { publicCode: "RESET-ME" }),
    ).toBeNull();
    expect(
      await t.query(api.sessions.publicSummary, { publicCode: "KEEP-ME" }),
    ).not.toBeNull();
    expect(await t.query(api.inbound.stats)).toMatchObject({
      inboundCount: 1,
      contactChannels: ["email"],
    });
  });

  it("accepts only one of two concurrent responses to the same inject", async () => {
    const t = convexTest(schema, modules);
    const context = await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert("sessions", {
        scenarioId: "asteria-bay3-v1",
        publicCode: "CONCURRENT",
        status: "running",
        version: 1,
        demoTenant: "concurrent",
        startedAt: 0,
        createdAt: 0,
        updatedAt: 0,
      });
      const roleId = await ctx.db.insert("roles", {
        sessionId,
        roleKey: "field",
        displayName: "Field Engineer",
        publicAlias: "FE-1",
        joinCodeHash: "hash",
        joinCodeExpiresAt: 10_000,
        status: "active",
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      const injectId = await ctx.db.insert("injects", {
        sessionId,
        injectKey: "F1",
        roleId,
        status: "open",
        exerciseText: "synthetic concurrent test",
        allowedDecisions: ["SEAL_BAY_3", "WAIT"],
        prerequisiteKeys: [],
        opensAt: 0,
        clarificationCount: 0,
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.patch(roleId, { currentInjectId: injectId });
      await ctx.db.insert("endpoints", {
        sessionId,
        roleId,
        channel: "telegram",
        conversationId: "concurrent-conversation",
        connectionId: "telegram-connection",
        senderFingerprint: "sender-hash",
        active: true,
        joinedAt: 0,
        lastSeenAt: 0,
      });
      await ctx.db.insert("worldFacts", {
        sessionId,
        factKey: "bay3.access",
        value: "OPEN",
        version: 1,
        sourceEventId: "initial",
        validFrom: 0,
        createdAt: 0,
      });
      return { sessionId, injectId };
    });
    const base = {
      conversationId: "concurrent-conversation",
      injectId: context.injectId,
      expectedInjectVersion: 1,
      parseMethod: "command" as const,
      rawTextRedacted: "[redacted]",
      now: 100,
    };
    const results = await Promise.all([
      t.mutation(api.decisions.accept, {
        ...base,
        inboundEventId: "response-a",
        canonicalDecision: "SEAL_BAY_3",
      }),
      t.mutation(api.decisions.accept, {
        ...base,
        inboundEventId: "response-b",
        canonicalDecision: "WAIT",
      }),
    ]);
    expect(results.map(({ outcome }) => outcome).sort()).toEqual([
      "applied",
      "stale",
    ]);
    const decisions = await t.run(
      async (ctx) =>
        await ctx.db
          .query("decisions")
          .withIndex("by_session_created", (q) =>
            q.eq("sessionId", context.sessionId),
          )
          .collect(),
    );
    expect(decisions.filter(({ status }) => status === "applied")).toHaveLength(
      1,
    );
    expect(
      decisions.filter(({ status }) => status === "rejected_stale"),
    ).toHaveLength(1);
  });
});
