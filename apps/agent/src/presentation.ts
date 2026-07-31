import type { Block, Media } from "caspian-sdk";
import {
  hasChannelCapability,
  type ChannelCapabilities,
} from "@signal-fracture/caspian";

const RICH_BLOCK_CHANNELS = new Set(["email", "telegram", "discord"]);

type StoredPayload = {
  text: string;
  html?: string;
  blocks?: unknown[];
  media?: unknown[];
};

export type PresentedPayload = {
  text: string;
  html: string | null;
  blocks: Block[] | null;
  media: Media[] | null;
};

function isBlock(value: unknown): value is Block {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

function isMedia(value: unknown): value is Media {
  return value !== null && typeof value === "object";
}

export function capabilityGatedPayload(
  channel: string,
  payload: StoredPayload,
  capabilities: ChannelCapabilities,
): PresentedPayload {
  const normalizedChannel = channel.toLowerCase();
  const supportsInteractions = hasChannelCapability(
    capabilities,
    normalizedChannel,
    "interactions",
  );
  const blocks = RICH_BLOCK_CHANNELS.has(normalizedChannel)
    ? (payload.blocks ?? [])
        .filter(isBlock)
        .filter((block) => block.type !== "buttons" || supportsInteractions)
    : [];
  const media = hasChannelCapability(capabilities, normalizedChannel, "media")
    ? (payload.media ?? []).filter(isMedia)
    : [];
  return {
    text: payload.text,
    html: payload.html ?? null,
    blocks: blocks.length === 0 ? null : blocks,
    media: media.length === 0 ? null : media,
  };
}
