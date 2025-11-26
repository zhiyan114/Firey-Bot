import type { ChatUserstate } from "tmi.js";
import type { TwitchClient } from "../../core/TwitchClient";
import type { baseTCommand } from "../../core/baseCommand";
import { captureException, metrics } from "@sentry/node-core";
import { DiscordCommand, LinkCommand, LurkCommand } from "../../commands/twitch";
import { TwitchUser } from "../../utils/TwitchUser";

export const commands: baseTCommand[] = [
  new LurkCommand(),
  new DiscordCommand(),
  new LinkCommand(),
] satisfies baseTCommand[];

type eventType = {
  channel: string;
  user: ChatUserstate;
  message: string;
  self: boolean;
  client: TwitchClient;
}

export async function processCommand(eventData: eventType): Promise<boolean | undefined> {
  // Validate if this action is command
  eventData.message = eventData.message.trim();
  if(eventData.message[0] !== eventData.client.discord.config.twitch.prefix) return;

  // Grab command data stuff
  const args = eventData.message.split(" ");
  const cmdName = args[0].slice(1, args[0].length).toLowerCase();
  const command = commands.find(c=>c.name.toLowerCase()===cmdName) as baseTCommand | undefined;
  if(!command) return;

  // Check access privileges
  if(command.perm.length > 0 && (!eventData.user.username || !command.perm.includes(eventData.user.username))) {
    await eventData.client.say(eventData.channel, `@${eventData.user.username}, you do not have permission to use this command.`);
    return false;
  }

  try {
    metrics.count(`twitch.cmd.execute`, 1, {
      attributes: {
        name: command.name
      }
    });
    await command.execute({
      ...eventData,
      args
    });
  } catch(ex) {
    // Feedback events are based on discord ID so there's that...
    const eventID = captureException(ex, { mechanism: { handled: false } });
    const dClient = eventData.client.discord;
    if(!eventData.user["user-id"]) return true;
    const tUser = await new TwitchUser(dClient, eventData.user["user-id"]).getCacheData();

    if(!tUser || !tUser.verified)
      return await eventData.client.say(eventData.channel, `@${eventData.user.username}, an error occured with the command! The developer has been notified.`) && true;
    await dClient.redis.set(`userSentryErrorID:${tUser.memberid}`, eventID, "EX", 1800);
    await eventData.client.say(eventData.channel, `@${eventData.user.username}, an error occured with the command! The developer has been notified. Since you have linked your discord ID, feel free to use the feedback command in the server to file a detailed report.`);
  }

  return true;
}