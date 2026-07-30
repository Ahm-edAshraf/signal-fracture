import { dispatchOnce, ensureCheckpoint } from "./durableEventLoop";
import { createAgentRuntime } from "./runtime";
import { participantMessage } from "@signal-fracture/shared";

const runtime = await createAgentRuntime();
let checkpoint = await ensureCheckpoint(runtime.client, runtime.state);

if (process.argv.includes("--email-test")) {
  const email = runtime.channels.find(({ channel }) => channel === "email");
  if (email === undefined) throw new Error("Email is not configured");
  await runtime.client.testEmail({
    text: "EXERCISE qualification ping",
    subject: "[EXERCISE] Signal Fracture qualification",
    connectionId: email.connectionId,
  });

  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const next = await dispatchOnce(runtime.client, runtime.state, checkpoint);
    if (next > checkpoint) {
      checkpoint = next;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

if (process.argv.includes("--proactive-email")) {
  const contact = await runtime.state.latestContact("email");
  if (contact === null)
    throw new Error("No persisted Email conversation exists");
  await runtime.client.sendMessage(
    contact.conversationId,
    participantMessage(
      "Proactive qualification inject delivered to a persisted conversation after restart.",
    ),
  );
}

checkpoint = await dispatchOnce(runtime.client, runtime.state, checkpoint);
console.info(
  JSON.stringify({
    event: "qualification_dispatch_complete",
    channels: runtime.channels.map(({ channel, status }) => ({
      channel,
      status,
    })),
    checkpointAdvanced: checkpoint > 0,
  }),
);
