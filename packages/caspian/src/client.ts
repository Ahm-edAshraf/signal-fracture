import { CommClient } from "caspian-sdk";
import type { ConnectedChannel } from "./types";

export type CaspianConfiguration = {
  apiKey: string;
  baseUrl: string;
  emailUsername?: string;
  telegramBotToken?: string;
  discordBotToken?: string;
};

export function createCaspianClient(config: CaspianConfiguration): CommClient {
  return new CommClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
}

export async function connectConfiguredChannels(
  client: CommClient,
  config: CaspianConfiguration,
): Promise<ConnectedChannel[]> {
  const connected: ConnectedChannel[] = [];

  if (config.emailUsername !== undefined) {
    const connection = await client.connectEmail({
      username: config.emailUsername,
    });
    connected.push({
      channel: "email",
      connectionId: connection.id,
      status: connection.status,
    });
  }

  if (config.telegramBotToken !== undefined) {
    const connection = await client.connectTelegram({
      botToken: config.telegramBotToken,
    });
    connected.push({
      channel: "telegram",
      connectionId: connection.id,
      status: connection.status,
    });
  }

  if (config.discordBotToken !== undefined) {
    const connection = await client.connectDiscord({
      botToken: config.discordBotToken,
    });
    connected.push({
      channel: "discord",
      connectionId: connection.id,
      status: connection.status,
    });
  }

  return connected;
}
