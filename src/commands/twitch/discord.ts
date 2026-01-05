import type { tmiTypes } from "../../core/baseCommand";
import { baseTCommand } from "../../core/baseCommand";
import { generalChannelID } from "../../config.json";

export class DiscordCommand extends baseTCommand {
  public name = "discord";
  public perm = [];
  public async execute(data: tmiTypes) {
    const invite = await data.client.dInvite
      .getTempInvite({
        reason: "Twitch Chat Requested Link",
        channel: generalChannelID,
        requestID: "twitchChat"
      });
    return data.client.say(data.channel, `@${data.user.username}, here is our discord invite link: ${invite}`);
  }
}