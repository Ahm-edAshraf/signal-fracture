import type { AgentState } from "./state";
import { logPublic } from "./publicLog";

type DeadlineState = Pick<AgentState, "sweepDeadlines">;

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

export async function runDeadlineWorker(input: {
  state: DeadlineState;
  signal: AbortSignal;
  pollIntervalMs: number;
  maxBackoffMs: number;
}): Promise<void> {
  let backoffMs = input.pollIntervalMs;
  while (!input.signal.aborted) {
    try {
      await input.state.sweepDeadlines();
      backoffMs = input.pollIntervalMs;
      await delay(input.pollIntervalMs, input.signal);
    } catch (error) {
      logPublic(
        {
          event: "deadline_sweep_failed",
          errorCode: error instanceof Error ? error.name : "UnknownError",
          backoffMs,
        },
        "error",
      );
      await delay(backoffMs, input.signal);
      backoffMs = Math.min(backoffMs * 2, input.maxBackoffMs);
    }
  }
}
