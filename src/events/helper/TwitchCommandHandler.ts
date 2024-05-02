import { ChatUserstate } from "tmi.js";
import { TwitchClient } from "../../core/TwitchClient";
import { baseTCommand } from "../../core/baseCommand";
import { metrics } from "@sentry/node";
import { twitch } from "../../config.json";

const commands: baseTCommand[] = [

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
  if(eventData.message[0] !== twitch.prefix) return;

  // Grab command data stuff
  const args = eventData.message.split(" ");
  const cmdName = args[0].slice(1, args[0].length).toLowerCase();
  const command = commands.find(c=>c.name.toLowerCase()===cmdName) as baseTCommand | undefined;
  if(!command) return;

  // Execute command, assuming all the checks are passed (and track their usages)
  metrics.increment("twitch.command.executed", 1, {
    timestamp: new Date().getTime(),
    tags: {
      command: cmdName
    }
  });

  await command.execute({
    channel: eventData.channel,
    user: eventData.user,
    message: eventData.message,
    self: eventData.self,
    client: eventData.client,
    args
  });
  return true;
}