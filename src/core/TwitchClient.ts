import type { baseClient } from "./baseClient";
import { Client } from "tmi.js";
import { StreamEvents, TwitchEvents } from "../events";
import { streamClient } from "./helper/twitchStream";
import { twitch } from "../config.json";
import { sendLog } from "../utils/eventLogger";
import { patchClient } from "../utils/MPClient";



export class TwitchClient extends Client implements baseClient {
  readonly streamClient: streamClient;

  constructor() {
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
    patchClient(this, "twitch");

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