type PublicLogEvent = {
  event: string;
  channel?: string;
  status?: string;
  errorCode?: string;
  latencyMs?: number;
  attempt?: number;
  permanent?: boolean;
  backoffMs?: number;
  channels?: { channel: string; status: string }[];
};

export function serializePublicLog(event: PublicLogEvent): string {
  return JSON.stringify(event);
}

export function logPublic(
  event: PublicLogEvent,
  level: "info" | "error" = "info",
) {
  const line = serializePublicLog(event);
  if (level === "error") console.error(line);
  else console.info(line);
}
