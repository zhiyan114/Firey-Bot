import type { Channel, ColorResolvable } from "discord.js";
import { EmbedBuilder, TextChannel } from "discord.js";
import { getClient, logger } from "@sentry/node-core";


export interface LogData {
  type: "Interaction" | "Info" | "Warning" | "Error";
  message: string;
  metadata?: {[key: string]: string | undefined};
}

let _channel: TextChannel | undefined;
const _logQueues: LogData[] = [];

/**
 * Initialize logging service with a discord channel
 */
export async function initialize(channel: Channel) {
  // Prevent double initialization
  if(!_channel) {
    await sendLog({
      type: "Error",
      message: "System attempted to initialize log service twice"
    });
    return console.log("Log channel already initialized!");
  }
  if(!(channel instanceof TextChannel))
    throw new Error("[Logger]: Attempted to initialize log channel with a non-text channel");
  _channel = channel;
  // Send all the queued logs
  let data;
  while((data = _logQueues.pop()))
    await sendLog(data);
}


export async function sendLog(log: LogData) {
  // Queue the log if the channel is not initialized
  if(!_channel) {
    console.log(`Log channel not initialized, this log will be added to the pre-initialization queue! (Log Message: ${log.message})`);
    _logQueues.push(log);
    return;
  }

  // Send the log
  await _channel.send({
    content: log.type === "Error" ? "<@233955058604179457>" : undefined,
    embeds: [prepareEmbed(log)]
  });
  switch(log.type) {
    case "Interaction":
      logger.debug(logger.fmt`[User Interaction] ${log.message}`, log.metadata);
      break;
    case "Info":
      logger.info(logger.fmt`[Event Logger] ${log.message}`, log.metadata);
      break;
    case "Warning":
      logger.warn(logger.fmt`[Event Logger] ${log.message}`, log.metadata);
      break;
    case "Error":
      logger.error(logger.fmt`[Event Logger] ${log.message}`, log.metadata);
      break;
  }
}

function prepareEmbed(log: LogData): EmbedBuilder {
  // Setup the basic embed stuff
  const embed = new EmbedBuilder()
    .setTitle(`${log.type} Log`)
    .setDescription(log.message)
    .setColor(EmbedColor(log.type))
    .setTimestamp()
    .setFooter({ text: `Internal Report System | ver ${getClient()?.getOptions().release}` });

  // Add the metadata if it exists
  if(log.metadata)
    for(const [name, value] of Object.entries(log.metadata))
      if(value) embed.addFields({ name, value });

  return embed;
}

function EmbedColor(type: "Interaction" | "Info" | "Warning" | "Error"): ColorResolvable {
  switch(type) {
    case "Interaction":
      return "#00FF00";
    case "Info":
      return "#0000FF";
    case "Warning":
      return "#FFFF00";
    case "Error":
      return "#FF0000";
    default:
      return "#000000";
  }
}