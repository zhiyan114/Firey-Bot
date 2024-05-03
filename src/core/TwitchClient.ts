import { Client } from "tmi.js";
import { DiscordClient } from "./DiscordClient";
import { TwitchEvents } from "../events";


export class TwitchClient extends Client {
  public dClient: DiscordClient;
  constructor(client: DiscordClient, token: string) {
    super({
      connection: {
        reconnect: true,
        secure: true,
      },
      // @TODO: Eventually configify this
      identity: {
        username: "fireybotuwu",
        password: `oauth:${token}`
      },
      channels: [client.config.twitch.channel]
    });
    this.dClient = client;

    // Register events
    new TwitchEvents(this)
      .registerEvents();
  }
    
  public async start() {
    await this.connect();
    await this.dClient.logger.sendLog({
      type: "Info",
      message: "Twitch client has been initialized!"
    });
  }

  public async dispose() {
    await this.disconnect();
  }
}