// Worked on after logger is added...

import { captureException } from "@sentry/node";
import { DiscordClient } from "../core/DiscordClient";
import { baseEvent } from "../core/baseEvent";


export class RedisEvents extends baseEvent {
  client: DiscordClient;
  alreadyReconWarned = false;

  constructor(client: DiscordClient) {
    super();
    this.client = client;
  }

  public registerEvents() {
    this.client.redis.on("error", this.error.bind(this));
    this.client.redis.on("ready", this.ready.bind(this));
    this.client.redis.on("reconnecting", this.reconnecting.bind(this));
  }

  private error(err: Error) {
    if(err.message === "Connection timeout") return;
    if(err.message === "getaddrinfo ENOTFOUND redis") return;
    captureException(err);
    this.client.logger.sendLog({
      type: "Error",
      message: "Redis: Client Thrown Exception"
    });
  }

  private ready() {
    this.alreadyReconWarned = false;

    console.log("Redis Connected");
    this.client.logger.sendLog({
      type: "Info",
      message: "Redis: Connection Established"
    });
  }

  private reconnecting() {
    // We don't need the reconnect to spam...
    this.alreadyReconWarned = true;
    if(this.alreadyReconWarned)
      return;

    console.log("Redis reconnecting...");
    this.client.logger.sendLog({
      type: "Warning",
      message: "Redis: Connection Issue, Reconnecting..."
    });
  }
}