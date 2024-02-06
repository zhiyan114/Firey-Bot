// Worked on after logger is added...

import { captureException } from "@sentry/node";
import { DiscordClient } from "../core/DiscordClient";
import { baseEvent } from "../core/baseEvent";
import { connect } from "amqplib";

/**
 * AMQP Events does fall out of implementation a bit due to it's lack of "class-based" client.
 */
export class AMQPEvents extends baseEvent {
  client: DiscordClient;
  constructor(client: DiscordClient) {
    super();
    this.client = client;
  }

  public registerEvents() {
    // type check stuff lmao
    if(!this.client.amqp) return;
    this.initSetup();
    this.client.amqp.on("error", this.error.bind(this));
    this.client.amqp.on("close", this.close.bind(this));
  }

  public initSetup() {
    // Setup channel listeners here
    console.log("AMQP Events Registered!");
  }

  private error(err: Error) {
    console.error(err);
    if((err as Error).message !== "Connection closing")
      captureException(err);
  }

  private close() {
    // Perform reconnect
    this.client.logger.sendLog({
      type: "Warning",
      message: "AMQP Server disconnected, reconnecting in 5 seconds..."
    });

    setTimeout(this.reconnect.bind(this), 5000);
  }

  private async reconnect() {
    this.client.amqp = await connect(process.env["AMQP_CONN"]!);
    this.registerEvents();
  }
}