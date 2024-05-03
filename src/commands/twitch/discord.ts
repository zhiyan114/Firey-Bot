
import { baseTCommand, tmiTypes } from "../../core/baseCommand";
import { DiscordInvite } from "../../utils/DiscordInvite";

export class DiscordCommand extends baseTCommand {
  public name = "discord";
  public async execute(data: tmiTypes) {
    const invite = await new DiscordInvite(data.client.dClient, "twitchChat")
      .getTempInvite({reason: "Twitch Chat Requested Link"}, data.client.dClient.config.generalChannelID);
    return data.client.say(data.channel, `@${data.user.username}, here is our discord invite link: ${invite}`);
  }
}