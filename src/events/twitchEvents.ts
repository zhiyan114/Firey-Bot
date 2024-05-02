import { ChatUserstate } from "tmi.js";
import { TwitchClient } from "../core/TwitchClient";
import { baseTEvent } from "../core/baseEvent";
import { TwitchUser } from "../utils/TwitchUser";
import { processCommand } from "./helper/TwitchCommandHandler";


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
    if(!userstate["user-id"] || !userstate['username']) return;

    // Keep username up to date
    const tUser = new TwitchUser(this.client, userstate['user-id']);
    const uData = await tUser.getCacheData();
    if(uData && uData.verified)
      if(userstate['username'] !== uData.username) {
        await tUser.updateDataCache({
          username: userstate['username']
        });
        await tUser.updateUser({
          username: userstate['username']
        });
      }

    // Pass for command handling
    const res = await processCommand({
      channel,
      user: userstate,
      message,
      self,
      client: this.client
    });
    if(res) return;

    // Point awarding @TODO: Implement after refactoring streamClient...
  }
}