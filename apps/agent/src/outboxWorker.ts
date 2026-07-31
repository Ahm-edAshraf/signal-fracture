import { randomUUID } from "node:crypto";
import type { CommClient } from "caspian-sdk";
import type { AgentState } from "./state";
import { logPublic } from "./publicLog";
import { capabilityGatedPayload } from "./presentation";
import type { ChannelCapabilities } from "@signal-fracture/caspian";

type OutboxClient = Pick<CommClient, "sendMessage">;
type OutboxState = Pick<
  AgentState,
  | "claimNextDelivery"
  | "markDeliveryFailed"
  | "markDeliverySent"
  | "recoverStaleDeliveries"
>;

const IDLE_POLL_MS = 500;
const MAX_STATE_BACKOFF_MS = 30_000;
const STALE_RECOVERY_INTERVAL_MS = 60_000;

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function providerMessageId(
  result: Record<string, unknown>,
): string | undefined {
  for (const key of ["id", "message_id", "messageId"]) {
    const value = result[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function safeErrorCode(error: unknown): string {
  if (error !== null && typeof error === "object" && "statusCode" in error) {
    const statusCode = error.statusCode;
    if (typeof statusCode === "number") return `caspian_http_${statusCode}`;
  }
  return error instanceof Error ? error.name : "UnknownError";
}

export async function runOutboxWorker(input: {
  client: OutboxClient;
  state: OutboxState;
  signal: AbortSignal;
  maxAttempts: number;
  channelCapabilities?: ChannelCapabilities;
}): Promise<void> {
  const workerId = randomUUID();
  let stateBackoffMs = IDLE_POLL_MS;
  let lastRecoveryAt = 0;

  while (!input.signal.aborted) {
    let delivery: Awaited<ReturnType<OutboxState["claimNextDelivery"]>>;
    try {
      const now = Date.now();
      if (now - lastRecoveryAt >= STALE_RECOVERY_INTERVAL_MS) {
        await input.state.recoverStaleDeliveries(input.maxAttempts);
        lastRecoveryAt = now;
      }
      delivery = await input.state.claimNextDelivery(workerId);
      stateBackoffMs = IDLE_POLL_MS;
    } catch (error) {
      logPublic(
        {
          event: "outbox_state_failed",
          operation: lastRecoveryAt === 0 ? "recovery_or_claim" : "claim",
          errorCode: safeErrorCode(error),
          backoffMs: stateBackoffMs,
        },
        "error",
      );
      await delay(stateBackoffMs, input.signal);
      stateBackoffMs = Math.min(stateBackoffMs * 2, MAX_STATE_BACKOFF_MS);
      continue;
    }

    if (delivery === null) {
      await delay(IDLE_POLL_MS, input.signal);
      continue;
    }

    const startedAt = Date.now();
    let providerMessageIdValue: string | undefined;
    try {
      const presented = capabilityGatedPayload(
        delivery.channel,
        delivery.payload,
        input.channelCapabilities ?? new Map(),
      );
      const result = await input.client.sendMessage(
        delivery.conversationId,
        presented.text,
        presented.html,
        presented.blocks,
        presented.media,
      );
      providerMessageIdValue = providerMessageId(result);
    } catch (error) {
      const backoffMs = Math.min(30_000, 1_000 * 2 ** (delivery.attempts - 1));
      let persistenceBackoffMs = IDLE_POLL_MS;
      while (!input.signal.aborted) {
        try {
          const outcome = await input.state.markDeliveryFailed({
            deliveryId: delivery._id,
            errorCode: safeErrorCode(error),
            maxAttempts: input.maxAttempts,
            retryAt: Date.now() + backoffMs,
          });
          logPublic(
            {
              event: "delivery_failed",
              channel: delivery.channel,
              attempt: delivery.attempts,
              permanent: outcome.permanent,
              errorCode: safeErrorCode(error),
            },
            "error",
          );
          break;
        } catch (persistenceError) {
          logPublic(
            {
              event: "delivery_failure_persist_failed",
              channel: delivery.channel,
              errorCode: safeErrorCode(persistenceError),
              backoffMs: persistenceBackoffMs,
            },
            "error",
          );
          await delay(persistenceBackoffMs, input.signal);
          persistenceBackoffMs = Math.min(
            persistenceBackoffMs * 2,
            MAX_STATE_BACKOFF_MS,
          );
        }
      }
      continue;
    }

    // Once the provider has accepted the send, retry only the acknowledgement.
    // Retrying sendMessage here would create a duplicate participant message.
    let acknowledgementBackoffMs = IDLE_POLL_MS;
    while (!input.signal.aborted) {
      try {
        await input.state.markDeliverySent({
          deliveryId: delivery._id,
          ...(providerMessageIdValue === undefined
            ? {}
            : { providerMessageId: providerMessageIdValue }),
          latencyMs: Date.now() - startedAt,
        });
        break;
      } catch (error) {
        logPublic(
          {
            event: "delivery_ack_persist_failed",
            channel: delivery.channel,
            errorCode: safeErrorCode(error),
            backoffMs: acknowledgementBackoffMs,
          },
          "error",
        );
        await delay(acknowledgementBackoffMs, input.signal);
        acknowledgementBackoffMs = Math.min(
          acknowledgementBackoffMs * 2,
          MAX_STATE_BACKOFF_MS,
        );
      }
    }
  }
}
