import { baseTCommand, tmiTypes } from "../../core/baseCommand";
import { TwitchUser } from "../../utils/TwitchUser";

export class LinkCommand extends baseTCommand {
  public name = "link";
  public perm = [];
  public async execute(data: tmiTypes) {
    const discordID = data.args[1];
    if(!data.user["user-id"]) return;
    if(!data.user.username) return;
    const tUser = new TwitchUser(data.client.dClient, data.user["user-id"]);
    const uData = await tUser.getCacheData();

    // General sanity check
    if(uData?.verified)
      return data.client.say(data.channel, `@${data.user.username}, your account is already verified. Please contact zhiyan114 if you would like to relink it.!`);
    if(!discordID)
      return data.client.say(data.channel, `@${data.user.username}, please provide your Discord ID to link your account.`);
    if(!/^\d+$/.test(discordID) || discordID.length < 17)
      return data.client.say(data.channel, `@${data.user.username}, invalid Discord ID. Please provide a valid Discord ID.`);
    if(uData?.memberid === discordID)
      return data.client.say(data.channel, `@${data.user.username}, no new discord ID has been set. Please use the tverify command in the discord server to complete the process.`);

    // Check if the account is already linked
    const linkCount = await data.client.dClient.prisma.twitch.count({
      where: {
        memberid: discordID,
        verified: true,
      }
    });
    if(linkCount > 0)
      return data.client.say(data.channel, `@${data.user.username}, this Discord ID is already linked to another account. Please contact zhiyan114 if you believe this is an error.`);

    // Check if user has already joined in the discord server
    const dAccCount = await data.client.dClient.prisma.members.findUnique({
      where: {
        id: discordID,
      }
    });
    if(!dAccCount)
      return data.client.say(data.channel, `@${data.user.username}, this Discord ID is not registered in the server. Please join the discord server and try again.`);
    if(dAccCount.rulesconfirmedon === null)
      return data.client.say(data.channel, `@${data.user.username}, this Discord ID is not verified in the server. Please verify your account and try again.`);

    // Start the linking process
    await tUser.createUser({
      username: data.user.username,
      memberid: discordID,
    });
    return await data.client.say(data.channel, `@${data.user.username}, your verification process has been started! Please use the tverify command in the discord server to complete the process.`);
  }
}