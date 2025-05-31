import type { ColorResolvable } from "discord.js";
import type { DiscordClient } from "../DiscordClient";
import { EmbedBuilder, TextChannel } from "discord.js";
import { suppressTracing } from "@sentry/node";
import { logger } from "@sentry/node";


export interface LogData {
  type: "Interaction" | "Info" | "Warning" | "Error";
  message: string;
  metadata?: {[key: string]: string | undefined};
}


/**
 * Discord Channel Event Logger
 * @method initalize - Should only be invoked after the client is ready
 * @method sendLog - Create and send the log to the log channels
 */
export class eventLogger {
  private client: DiscordClient;
  private channel?: TextChannel;
  private logQueues: LogData[] = []; // For logs received during unitialized state
  constructor(client: DiscordClient) {
    this.client = client;
  }

  async initalize() {
    // Prevent double initialization
    if(this.channel) {
      this.sendLog({
        type: "Error",
        message: "System attempted to initialize log service twice"
      });
      return console.log("Log channel already initialized!");
    }

    // Find and setup the channel
    const unknownChannel = await this.client.channels.fetch(this.client.config.logChannelID);
    if(unknownChannel === null)
      throw new Error("[Logger]: Log channel not found");
    if(!(unknownChannel instanceof TextChannel))
      throw new Error("[Logger]: Attempted to initialize log channel with a non-text channel");
    this.channel = unknownChannel;

    // Send all the queued logs
    for(const log of this.logQueues)
      await this.sendLog(log);
    this.logQueues = [];
  }

  async sendLog(log: LogData) {
    await suppressTracing(async ()=>{
      // Queue the log if the channel is not initialized
      if(!this.channel) {
        console.log(`Log channel not initialized, this log will be added to the pre-initialization queue! (Log Message: ${log.message})`);
        this.logQueues.push(log);
        return;
      }

      // Send the log
      await this.channel.send({
        content: log.type === "Error" ? "<@233955058604179457>" : undefined,
        embeds: [this.prepareEmbed(log)]
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

    });
  }

  private prepareEmbed(log: LogData): EmbedBuilder {
    // Setup the basic embed stuff
    const embed = new EmbedBuilder()
      .setTitle(`${log.type} Log`)
      .setDescription(log.message)
      .setColor(this.EmbedColor(log.type))
      .setTimestamp()
      .setFooter({ text: `Internal Report System | ver ${this.client.sysVer}` });

    // Add the metadata if it exists
    if(log.metadata)
      for(const [name, value] of Object.entries(log.metadata))
        if(value) embed.addFields({ name, value });

    return embed;
  }

  private EmbedColor(type: "Interaction" | "Info" | "Warning" | "Error"): ColorResolvable {
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
}