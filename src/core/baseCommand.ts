import { CommandInteraction, SlashCommandBuilder } from "discord.js";

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
  public abstract metadata: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  public abstract access?: accessPerms;
  public abstract execute(interaction: CommandInteraction): Promise<void>;
}

/**
 * Base Class for twitch bot commands
 */

export abstract class baseTCommand {

}