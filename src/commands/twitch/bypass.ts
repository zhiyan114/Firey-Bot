
import { baseTCommand, tmiTypes } from "../../core/baseCommand";
import { TwitchUser } from "../../utils/TwitchUser";

export class BypassCommand extends baseTCommand {
  public name = "bypass";
  public perm = [];
  private discordRoles = ["908090260087513098", "907769458670575658"];
  public async execute(data: tmiTypes) {
    if(!data.user["user-id"]) return;
    const memberID = (await new TwitchUser(data.client.discord, data.user["user-id"])
      .getCacheData())?.memberid;
    if(!memberID)
      return data.client.say(data.channel, `@${data.user.username}, Please link your discord account before using this command: !link [DiscordID].`);

    // Check privilege
    const member = await data.client.discord.guilds.cache.first()?.members.fetch(memberID);
    if(!member) return data.client.say(data.channel, `@${data.user.username}, You are no longer in the server; thus, cannot verify your privilege.`);
    if(!this.discordRoles.find(k=>member.roles.cache.has(k)))
      return data.client.say(data.channel, `@${data.user.username}, Privilege Insufficient.`);

    // Send the message
    const message = data.message.slice(9, data.message.length);
    return await data.client.say(data.channel, `[@${data.user.username}]: ${message}`);
  }
}