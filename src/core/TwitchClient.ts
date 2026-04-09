import type { baseClient } from "./baseClient.js";
import { Client } from "tmi.js";
import { StreamEvents, TwitchEvents } from "../events/index.js";
import { streamClient } from "./helper/twitchStream.js";
import { twitch } from "../config.js";
import { sendLog } from "../utils/eventLogger.js";
import type { ServiceClient } from "./ServiceClient.js";
import type { DiscordClient } from "./DiscordClient.js";
import type { DiscordInvite } from "./helper/DiscordInvite.js";
import { patchClient } from "../utils/MPReqID.js";



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
    patchClient(this, "twitch");

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