import type { CommandInteraction, ContextMenuCommandBuilder, ContextMenuCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import type { DiscordClient } from "./DiscordClient";
import type { ChatUserstate } from "tmi.js";
import type { TwitchClient } from "./TwitchClient";

/**
 * users supplies discord User ID while roles supplies discord Role ID
 */
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
  abstract readonly client: DiscordClient;
  public readonly abstract metadata: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | ContextMenuCommandBuilder | SlashCommandOptionsOnlyBuilder;
  public readonly abstract access: accessPerms;
  public abstract execute(interaction: CommandInteraction | ContextMenuCommandInteraction): void | Promise<void | unknown>;
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
 * @member name: string - The name of the command
 * @member perm: string[] - The permissions required to execute the command (twitch users)
 * @abstract execute: (data: tmiTypes) => Promise<void> - The function that will be executed when the command is called
 */

export abstract class baseTCommand {
  public abstract name: string;
  public abstract perm: string[];
  public abstract execute(data: tmiTypes): void | Promise<void | unknown>;
}