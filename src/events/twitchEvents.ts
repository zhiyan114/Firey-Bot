import type { ChatUserstate } from "tmi.js";
import type { TwitchClient } from "../core/TwitchClient";
import { baseTEvent } from "../core/baseEvent";
import { TwitchUser } from "../utils/TwitchUser";
import { processCommand } from "./helper/TwitchCommandHandler";
import { captureException, withIsolationScope } from "@sentry/node-core";


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

    await withIsolationScope(async (scope) => {
      try {
        if(!userstate["user-id"] || !userstate['username']) return;

        scope.setUser({
          id: userstate["user-id"],
          username: userstate.username,
          userType: userstate["user-type"] || "viewer"
        });
        scope.setTag("platform", "twitch");

        // Keep username up to date
        const tUser = new TwitchUser(this.client.discord, userstate['user-id']);
        const uData = await tUser.getCacheData();
        if(uData?.verified)
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

        // Point awarding system
        if(!this.client.streamClient.isStreaming) return;
        const discordUser = await tUser.getDiscordUser();
        if(!(uData?.memberid) || uData.memberid === "-1" || !discordUser) return;
        await discordUser.economy.chatRewardPoints(message);
      } catch(ex) { captureException(ex); }
    });
  }
}