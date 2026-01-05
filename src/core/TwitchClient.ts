import type { baseClient } from "./baseClient";
import { Client } from "tmi.js";
import { StreamEvents, TwitchEvents } from "../events";
import { streamClient } from "./helper/twitchStream";
import { twitch } from "../config.json";
import { sendLog } from "../utils/eventLogger";
import type { ServiceClient } from "./ServiceClient";
import type { DiscordClient } from "./DiscordClient";
import type { DiscordInvite } from "./helper/DiscordInvite";



export class TwitchClient extends Client implements baseClient {
  readonly streamClient: streamClient;
  readonly service: ServiceClient;
  readonly dInvite: DiscordInvite;

  constructor(service: ServiceClient, dClient: DiscordClient) {
    super({
      connection: {
        reconnect: true,
        secure: true,
      },
      // @TODO: Eventually configify this
      identity: {
        username: process.env["TWITCH_USERNAME"],
        password: `oauth:${process.env["TWITCH_TOKEN"]}`
      },
      channels: [twitch.channel]
    });
    this.streamClient = new streamClient(this, twitch.channel);
    this.service = service;
    this.dInvite = dClient.inviteManager;

    // Register events
    new TwitchEvents(this, dClient)
      .registerEvents();
    new StreamEvents(this, dClient)
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