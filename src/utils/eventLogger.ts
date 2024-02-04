import { TextChannel } from "discord.js";
import { DiscordClient } from "../core/DiscordClient";

export enum LogType {
  Interaction,
  Info,
  Warning,
  Error
}

export interface LogData {
  type: LogType;
  message: string;
  metadata?: {[key: string]: string | undefined};
}


/**
 * Discord Channel Event Logger
 */
export class eventLogger {
  client: DiscordClient;
  channel?: TextChannel;
  logQueues: LogData[] = []; // For logs received during unitialized state
  constructor(client: DiscordClient) {
    this.client = client;
  }
  
  // Should only be invoked after the client is ready
  async initalize() {
    if(this.channel) {
      this.sendLog({
        type: LogType.Error,
        message: "System attempted to initialize log service twice"
      });
      return console.log("Log channel already initialized!");
    }

    const unknownChannel = await this.client.channels.fetch(this.client.config.logChannelID);
    if(!(unknownChannel instanceof TextChannel))
      throw new Error("[Logger]: Attempted to initialize log channel with a non-text channel");

    this.channel = unknownChannel;
    for(const log of this.logQueues)
      await this.sendLog(log);
    this.logQueues = [];
  }
  async sendLog(log: LogData) {
    
  }
  private prepareEmbed() {

  }
}