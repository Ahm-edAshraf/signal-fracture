import { runDurableEventLoop } from "./durableEventLoop";
import { createAgentRuntime } from "./runtime";
import { runOutboxWorker } from "./outboxWorker";
import { startHealthServer } from "./health";
import { logPublic } from "./publicLog";

const controller = new AbortController();
for (const event of ["SIGINT", "SIGTERM"] as const) {
  process.on(event, () => controller.abort());
}

const runtime = await createAgentRuntime();
const healthServer = startHealthServer(
  runtime.env.AGENT_HEALTH_PORT,
  runtime.channels,
);
logPublic({
  event: "agent_ready",
  channels: runtime.channels.map(({ channel, status }) => ({
    channel,
    status,
  })),
});

await Promise.all([
  runDurableEventLoop(runtime.client, runtime.state, {
    pollIntervalMs: runtime.env.CASPIAN_POLL_INTERVAL_MS,
    maxBackoffMs: runtime.env.CASPIAN_MAX_BACKOFF_MS,
    signal: controller.signal,
  }),
  runOutboxWorker({
    client: runtime.client,
    state: runtime.state,
    signal: controller.signal,
    maxAttempts: runtime.env.OUTBOX_MAX_ATTEMPTS,
  }),
]);
healthServer.close();
