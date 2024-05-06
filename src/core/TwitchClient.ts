import { Client } from "tmi.js";
import { DiscordClient } from "./DiscordClient";
import { StreamEvents, TwitchEvents } from "../events";
import { streamClient } from "./helper/twitchStream";
import { baseClient } from "./baseClient";


export class TwitchClient extends Client implements baseClient {
  public dClient: DiscordClient;
  public streamClient: streamClient;
  
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
    this.streamClient = new streamClient(this, client.config.twitch.channel);

    // Register events
    new TwitchEvents(this)
      .registerEvents();
    new StreamEvents(this)
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