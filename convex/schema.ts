import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roleKey = v.union(
  v.literal("field"),
  v.literal("control"),
  v.literal("director"),
);

export default defineSchema({
  sessions: defineTable({
    scenarioId: v.string(),
    publicCode: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("resolving"),
      v.literal("completed"),
      v.literal("aborted"),
      v.literal("failed"),
    ),
    version: v.number(),
    demoTenant: v.string(),
    pausedFrom: v.optional(
      v.union(v.literal("running"), v.literal("resolving")),
    ),
    pausedAt: v.optional(v.number()),
    pauseReason: v.optional(
      v.union(
        v.literal("operator"),
        v.literal("delivery_failure"),
        v.literal("deadline"),
      ),
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_public_code", ["publicCode"])
    .index("by_tenant_status", ["demoTenant", "status"])
    .index("by_updated_at", ["updatedAt"]),

  roles: defineTable({
    sessionId: v.id("sessions"),
    roleKey,
    displayName: v.string(),
    publicAlias: v.string(),
    joinCodeHash: v.string(),
    joinCodeExpiresAt: v.number(),
    status: v.union(
      v.literal("unassigned"),
      v.literal("joined"),
      v.literal("active"),
      v.literal("left"),
      v.literal("completed"),
    ),
    currentInjectId: v.optional(v.id("injects")),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session_role", ["sessionId", "roleKey"])
    .index("by_join_code_hash", ["joinCodeHash"]),

  conversationContacts: defineTable({
    conversationId: v.string(),
    connectionId: v.string(),
    channel: v.string(),
    senderFingerprint: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_channel_last_seen", ["channel", "lastSeenAt"]),

  endpoints: defineTable({
    sessionId: v.id("sessions"),
    roleId: v.id("roles"),
    channel: v.string(),
    conversationId: v.string(),
    connectionId: v.string(),
    senderFingerprint: v.string(),
    active: v.boolean(),
    joinedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_role_active", ["roleId", "active"])
    .index("by_session_channel", ["sessionId", "channel"]),

  worldFacts: defineTable({
    sessionId: v.id("sessions"),
    factKey: v.string(),
    value: v.any(),
    version: v.number(),
    sourceEventId: v.string(),
    validFrom: v.number(),
    supersededAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_session_fact_version", ["sessionId", "factKey", "version"]),

  roleKnowledge: defineTable({
    sessionId: v.id("sessions"),
    roleId: v.id("roles"),
    factKey: v.string(),
    observedValue: v.any(),
    worldVersionObserved: v.number(),
    sourceInjectId: v.optional(v.id("injects")),
    learnedAt: v.number(),
    stale: v.boolean(),
  }).index("by_role_fact_learned", ["roleId", "factKey", "learnedAt"]),

  injects: defineTable({
    sessionId: v.id("sessions"),
    injectKey: v.string(),
    roleId: v.id("roles"),
    status: v.union(
      v.literal("planned"),
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("open"),
      v.literal("answered"),
      v.literal("closed"),
      v.literal("retrying"),
      v.literal("failed"),
      v.literal("expired"),
      v.literal("cancelled"),
    ),
    exerciseText: v.string(),
    emailSubject: v.optional(v.string()),
    allowedDecisions: v.array(v.string()),
    prerequisiteKeys: v.array(v.string()),
    faultType: v.optional(
      v.union(
        v.literal("delay"),
        v.literal("omission"),
        v.literal("stale_fact"),
        v.literal("conflict"),
        v.literal("escalation_delay"),
      ),
    ),
    opensAt: v.optional(v.number()),
    deadlineAt: v.optional(v.number()),
    closesAt: v.optional(v.number()),
    clarificationCount: v.number(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_session_inject_key", ["sessionId", "injectKey"]),

  decisions: defineTable({
    sessionId: v.id("sessions"),
    roleId: v.id("roles"),
    injectId: v.id("injects"),
    inboundEventId: v.string(),
    canonicalDecision: v.optional(v.string()),
    rawTextRedacted: v.string(),
    parseMethod: v.union(
      v.literal("command"),
      v.literal("phrase"),
      v.literal("gemini"),
      v.literal("clarification"),
    ),
    confidence: v.optional(v.number()),
    rationaleSummary: v.optional(v.string()),
    modelLatencyMs: v.optional(v.number()),
    modelUsed: v.optional(
      v.union(v.literal("primary"), v.literal("fallback"), v.literal("none")),
    ),
    status: v.union(
      v.literal("received"),
      v.literal("parsed"),
      v.literal("clarification_required"),
      v.literal("accepted"),
      v.literal("applied"),
      v.literal("rejected_stale"),
      v.literal("rejected_invalid"),
      v.literal("rejected_unauthorized"),
    ),
    appliedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_inbound_event", ["inboundEventId"])
    .index("by_inject_role", ["injectId", "roleId"])
    .index("by_session_created", ["sessionId", "createdAt"]),

  contradictions: defineTable({
    sessionId: v.id("sessions"),
    contradictionKey: v.string(),
    type: v.union(
      v.literal("ACTION_VS_WORLD_STATE"),
      v.literal("ACTION_VS_OTHER_ACTION"),
      v.literal("STALE_KNOWLEDGE_ACTION"),
      v.literal("MISSING_REQUIRED_ESCALATION"),
      v.literal("ROLE_EXPECTATION_MISMATCH"),
    ),
    status: v.union(
      v.literal("detected"),
      v.literal("notified"),
      v.literal("acknowledged"),
      v.literal("resolved"),
    ),
    factRefs: v.array(v.string()),
    decisionRefs: v.array(v.id("decisions")),
    detectedAt: v.number(),
    notifiedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    details: v.any(),
  }).index("by_session_key", ["sessionId", "contradictionKey"]),

  inboundEvents: defineTable({
    caspianEventId: v.string(),
    messageId: v.string(),
    conversationIdHash: v.string(),
    channel: v.string(),
    mediaCount: v.optional(v.number()),
    sessionId: v.optional(v.id("sessions")),
    roleId: v.optional(v.id("roles")),
    status: v.union(
      v.literal("claimed"),
      v.literal("processed"),
      v.literal("failed"),
    ),
    duplicateCount: v.optional(v.number()),
    outcomeRef: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_caspian_event", ["caspianEventId"])
    .index("by_message", ["messageId"])
    .index("by_conversation_received", ["conversationIdHash", "receivedAt"]),

  deliveries: defineTable({
    idempotencyKey: v.string(),
    sessionId: v.id("sessions"),
    roleId: v.id("roles"),
    injectId: v.optional(v.id("injects")),
    semanticType: v.string(),
    conversationId: v.string(),
    channel: v.string(),
    payload: v.object({
      text: v.string(),
      html: v.optional(v.string()),
      blocks: v.optional(v.array(v.any())),
      media: v.optional(v.array(v.any())),
    }),
    status: v.union(
      v.literal("pending"),
      v.literal("claimed"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    attempts: v.number(),
    nextAttemptAt: v.number(),
    providerMessageId: v.optional(v.string()),
    lastErrorCode: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_status_next_attempt", ["status", "nextAttemptAt"]),

  eventCheckpoints: defineTable({
    key: v.literal("caspian"),
    lastSeq: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  channelHealth: defineTable({
    channel: v.string(),
    status: v.string(),
    checkedAt: v.number(),
  }).index("by_channel", ["channel"]),

  auditEvents: defineTable({
    sessionId: v.optional(v.id("sessions")),
    type: v.string(),
    actorType: v.union(
      v.literal("participant"),
      v.literal("operator"),
      v.literal("agent"),
      v.literal("system"),
    ),
    roleId: v.optional(v.id("roles")),
    injectId: v.optional(v.id("injects")),
    deliveryId: v.optional(v.id("deliveries")),
    decisionId: v.optional(v.id("decisions")),
    contradictionId: v.optional(v.id("contradictions")),
    safeMetadata: v.any(),
    createdAt: v.number(),
  }).index("by_session_created", ["sessionId", "createdAt"]),

  reports: defineTable({
    sessionId: v.id("sessions"),
    metrics: v.any(),
    deterministicSummary: v.string(),
    narrative: v.optional(v.string()),
    narrativeModelLatencyMs: v.optional(v.number()),
    narrativeModelUsed: v.optional(
      v.union(v.literal("primary"), v.literal("fallback")),
    ),
    generatedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
