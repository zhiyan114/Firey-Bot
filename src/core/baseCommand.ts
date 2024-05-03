import { CommandInteraction, ContextMenuCommandBuilder, SlashCommandBuilder } from "discord.js";
import { DiscordClient } from "./DiscordClient";
import { ChatUserstate } from "tmi.js";
import { TwitchClient } from "./TwitchClient";

export type accessPerms = {
    users?: string[];
    roles?: string[];
}

/**
 * Base Class for discord bot commands
 * @abstract metadata: SlashCommandBuilder - General information about the command and is used to register the command
 * @abstract access?: accessPerms - Command access permissions, overrides the one that's set in guild; thus, only use when needed
 * @abstract execute: (interaction: CommandInteraction) => Promise<void> - The function that will be executed when the command is called
 */
export abstract class baseCommand {
  abstract client: DiscordClient;
  public abstract metadata: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | ContextMenuCommandBuilder;
  public abstract access: accessPerms;
  public abstract execute(interaction: CommandInteraction): Promise<void | unknown>;
}



export type tmiTypes = {
  channel: string;
  user: ChatUserstate;
  message: string;
  self: boolean;
  client: TwitchClient;
  args: string[];
}

/**
 * Base Class for twitch bot commands
 */

export abstract class baseTCommand {
  public abstract name: string;
  public abstract execute(data: tmiTypes): Promise<void | unknown>;
}