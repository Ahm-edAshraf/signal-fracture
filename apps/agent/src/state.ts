import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  conversationHash,
  type InboundEnvelope,
} from "@signal-fracture/caspian";

export class AgentState {
  readonly #client: ConvexHttpClient;

  readonly #operatorSecret: string;

  constructor(url: string, operatorSecret: string) {
    this.#client = new ConvexHttpClient(url);
    this.#operatorSecret = operatorSecret;
  }

  async claimInbound(envelope: InboundEnvelope) {
    return await this.#client.mutation(api.inbound.claim, {
      caspianEventId: envelope.eventId,
      messageId: envelope.messageId,
      conversationId: envelope.conversationId,
      conversationIdHash: conversationHash(envelope.conversationId),
      connectionId: envelope.connectionId,
      channel: envelope.channel,
      senderFingerprint: envelope.senderFingerprint,
      receivedAt: envelope.receivedAt,
    });
  }

  async completeInbound(messageId: string, outcomeRef: string): Promise<void> {
    await this.#client.mutation(api.inbound.complete, {
      messageId,
      outcomeRef,
      processedAt: Date.now(),
    });
  }

  async loadCheckpoint(): Promise<number | null> {
    return await this.#client.query(api.checkpoint.load, {});
  }

  async saveCheckpoint(lastSeq: number): Promise<number> {
    return await this.#client.mutation(api.checkpoint.save, { lastSeq });
  }

  async latestContact(channel: string) {
    return await this.#client.query(api.contacts.latestForChannel, {
      channel,
      operatorSecret: this.#operatorSecret,
    });
  }

  async claimNextDelivery(workerId: string) {
    return await this.#client.mutation(api.outbox.claimNext, {
      now: Date.now(),
      workerId,
    });
  }

  async markDeliverySent(input: {
    deliveryId: Id<"deliveries">;
    providerMessageId?: string;
    latencyMs: number;
  }): Promise<void> {
    await this.#client.mutation(api.outbox.markSent, {
      deliveryId: input.deliveryId,
      ...(input.providerMessageId === undefined
        ? {}
        : { providerMessageId: input.providerMessageId }),
      latencyMs: input.latencyMs,
      now: Date.now(),
    });
  }

  async markDeliveryFailed(input: {
    deliveryId: Id<"deliveries">;
    errorCode: string;
    maxAttempts: number;
    retryAt: number;
  }): Promise<{ permanent: boolean }> {
    return await this.#client.mutation(api.outbox.markFailed, {
      deliveryId: input.deliveryId,
      errorCode: input.errorCode,
      maxAttempts: input.maxAttempts,
      retryAt: input.retryAt,
      now: Date.now(),
    });
  }

  async recoverStaleDeliveries(maxAttempts: number): Promise<void> {
    const now = Date.now();
    await this.#client.mutation(api.outbox.requeueStaleClaims, {
      staleBefore: now - 60_000,
      now,
      maxAttempts,
    });
  }

  async joinRole(input: {
    roleKey: "field" | "control" | "director";
    joinCodeHash: string;
    conversationId: string;
    connectionId: string;
    channel: string;
    senderFingerprint: string;
  }) {
    return await this.#client.mutation(api.roles.join, {
      publicCode: "ASTERIA",
      ...input,
      now: Date.now(),
    });
  }

  async statusForConversation(conversationId: string) {
    return await this.#client.query(api.roles.statusForConversation, {
      conversationId,
    });
  }

  async abortByConversation(conversationId: string) {
    return await this.#client.mutation(api.sessions.abortByConversation, {
      conversationId,
      now: Date.now(),
    });
  }

  async activePrompt(conversationId: string) {
    return await this.#client.query(api.decisions.activePrompt, {
      conversationId,
    });
  }

  async acceptDecision(input: {
    inboundEventId: string;
    conversationId: string;
    injectId: Id<"injects">;
    expectedInjectVersion: number;
    canonicalDecision:
      | "SEAL_BAY_3"
      | "INSPECT"
      | "WAIT"
      | "ROUTE_BAY_3"
      | "ROUTE_BAY_5"
      | "NOTIFY_COMMANDER"
      | "WAIT_FOR_CONFIRMATION"
      | "PASSAGE_BLOCKED"
      | "PASSAGE_AVAILABLE"
      | "REROUTE_BAY_5"
      | "REQUEST_OVERRIDE"
      | "ESCALATE_NOW"
      | "HOLD";
    parseMethod: "command" | "phrase" | "gemini" | "clarification";
    confidence?: number;
    rawTextRedacted: string;
  }) {
    return await this.#client.mutation(api.decisions.accept, {
      ...input,
      now: Date.now(),
    });
  }

  async requestClarification(input: {
    inboundEventId: string;
    conversationId: string;
    injectId: Id<"injects">;
    expectedInjectVersion: number;
    rawTextRedacted: string;
  }) {
    return await this.#client.mutation(api.decisions.requestClarification, {
      ...input,
      now: Date.now(),
    });
  }
}
