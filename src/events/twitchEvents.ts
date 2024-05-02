import { ChatUserstate } from "tmi.js";
import { TwitchClient } from "../core/TwitchClient";
import { baseTEvent } from "../core/baseEvent";


export class TwitchEvents extends baseTEvent {
  public client: TwitchClient;
  constructor(client: TwitchClient) {
    super();
    this.client = client;
  }

  public registerEvents() {
    this.client.on("message", this.onMessage.bind(this));
  }

  private async onMessage(channel: string, userstate: ChatUserstate, message: string, self: boolean) {
    if(self) return;
    console.log(`${userstate.username}: ${message}`);
  }
}