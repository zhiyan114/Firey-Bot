import type { baseClient } from "./baseClient";
import type { DiscordClient } from "./DiscordClient";
import { Client } from "tmi.js";
import { StreamEvents, TwitchEvents } from "../events";
import { streamClient } from "./helper/twitchStream";
import { twitch } from "../config.json";
import { sendLog } from "../utils/eventLogger";



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
      channels: [twitch.channel]
    });
    this.discord = client;
    this.streamClient = new streamClient(this, twitch.channel);

    // Register events
    new TwitchEvents(this)
      .registerEvents();
    new StreamEvents(this)
      .registerEvents();

  }

  public async start() {
    await this.connect();
    await sendLog({
      type: "Info",
      message: "Twitch client has been initialized!"
    });
  }

  public async dispose() {
    await this.disconnect();
  }
}