import { Client } from "tmi.js";
import { DiscordClient } from "./DiscordClient";
import { StreamEvents, TwitchEvents } from "../events";
import { streamClient } from "./helper/twitchStream";
import { baseClient } from "./baseClient";


export class TwitchClient extends Client implements baseClient {
  readonly discord: DiscordClient;
  readonly streamClient: streamClient;

  constructor(client: DiscordClient, username: string, token: string) {
    super({
      connection: {
        reconnect: true,
        secure: true,
      },
      // @TODO: Eventually configify this
      identity: {
        username,
        password: `oauth:${token}`
      },
      channels: [client.config.twitch.channel]
    });
    this.discord = client;
    this.streamClient = new streamClient(this, client.config.twitch.channel);

    // Register events
    new TwitchEvents(this)
      .registerEvents();
    new StreamEvents(this)
      .registerEvents();

  }

  public async start() {
    await this.connect();
    await this.discord.logger.sendLog({
      type: "Info",
      message: "Twitch client has been initialized!"
    });
  }

  public async dispose() {
    await this.disconnect();
  }
}