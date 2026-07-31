export type ChannelCapabilities = ReadonlyMap<string, ReadonlySet<string>>;

export function parseChannelCapabilities(
  rows: readonly Record<string, unknown>[],
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const row of rows) {
    const channel =
      typeof row.channel === "string"
        ? row.channel.toLowerCase()
        : typeof row.type === "string"
          ? row.type.toLowerCase()
          : null;
    if (channel === null || !Array.isArray(row.capabilities)) continue;
    const capabilities = result.get(channel) ?? new Set<string>();
    for (const capability of row.capabilities) {
      if (typeof capability === "string") capabilities.add(capability);
    }
    result.set(channel, capabilities);
  }
  return result;
}

export function hasChannelCapability(
  capabilities: ChannelCapabilities,
  channel: string,
  capability: string,
): boolean {
  return capabilities.get(channel.toLowerCase())?.has(capability) ?? false;
}
