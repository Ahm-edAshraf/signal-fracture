import { createServer } from "node:http";
import type { ConnectedChannel } from "@signal-fracture/caspian";

export function startHealthServer(
  port: number,
  channels: readonly ConnectedChannel[],
) {
  const server = createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/healthz") {
      response.writeHead(200).end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (request.url === "/readyz") {
      const active = channels.filter(({ status }) => status === "active");
      const ready = active.length >= 2;
      response.writeHead(ready ? 200 : 503).end(
        JSON.stringify({
          status: ready ? "ready" : "degraded",
          channels: active.map(({ channel }) => channel),
        }),
      );
      return;
    }
    response.writeHead(404).end(JSON.stringify({ status: "not_found" }));
  });
  server.listen(port);
  return server;
}
