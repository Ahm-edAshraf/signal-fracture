import { randomUUID } from "node:crypto";
import type { CommClient } from "caspian-sdk";
import type { AgentState } from "./state";
import { logPublic } from "./publicLog";

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
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
  client: CommClient;
  state: AgentState;
  signal: AbortSignal;
  maxAttempts: number;
}): Promise<void> {
  const workerId = randomUUID();
  await input.state.recoverStaleDeliveries(input.maxAttempts);

  while (!input.signal.aborted) {
    const delivery = await input.state.claimNextDelivery(workerId);
    if (delivery === null) {
      await delay(250, input.signal);
      continue;
    }
    const startedAt = Date.now();
    try {
      const result = await input.client.sendMessage(
        delivery.conversationId,
        delivery.payload.text,
        delivery.payload.html ?? null,
      );
      const messageId = providerMessageId(result);
      await input.state.markDeliverySent({
        deliveryId: delivery._id,
        ...(messageId === undefined ? {} : { providerMessageId: messageId }),
        latencyMs: Date.now() - startedAt,
      });
    } catch (error) {
      const backoffMs = Math.min(30_000, 1_000 * 2 ** (delivery.attempts - 1));
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
    }
  }
}
