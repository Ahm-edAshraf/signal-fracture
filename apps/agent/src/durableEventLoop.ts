import type { CommClient } from "caspian-sdk";
import type { AgentState } from "./state";
import { logPublic } from "./publicLog";

type LoopOptions = {
  pollIntervalMs: number;
  maxBackoffMs: number;
  signal: AbortSignal;
};

async function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
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

export async function latestEventSequence(client: CommClient): Promise<number> {
  let lastSeq = 0;
  while (true) {
    const events = await client.events({ afterSeq: lastSeq, limit: 500 });
    if (events.length === 0) return lastSeq;
    for (const event of events) lastSeq = Math.max(lastSeq, event.seq);
    if (events.length < 500) return lastSeq;
  }
}

export async function ensureCheckpoint(
  client: CommClient,
  state: AgentState,
): Promise<number> {
  const stored = await state.loadCheckpoint();
  if (stored !== null) return stored;
  const baseline = await latestEventSequence(client);
  await state.saveCheckpoint(baseline);
  return baseline;
}

export async function dispatchOnce(
  client: CommClient,
  state: AgentState,
  checkpoint: number,
): Promise<number> {
  const next = await client.dispatchPending(checkpoint);
  if (next > checkpoint) await state.saveCheckpoint(next);
  return next;
}

export async function runDurableEventLoop(
  client: CommClient,
  state: AgentState,
  options: LoopOptions,
): Promise<void> {
  let checkpoint = await ensureCheckpoint(client, state);
  let backoff = options.pollIntervalMs;

  while (!options.signal.aborted) {
    try {
      checkpoint = await dispatchOnce(client, state, checkpoint);
      backoff = options.pollIntervalMs;
      await delay(options.pollIntervalMs, options.signal);
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : "UnknownError";
      logPublic(
        {
          event: "caspian_poll_failed",
          errorCode,
          backoffMs: backoff,
        },
        "error",
      );
      await delay(backoff, options.signal);
      backoff = Math.min(backoff * 2, options.maxBackoffMs);
    }
  }
}
