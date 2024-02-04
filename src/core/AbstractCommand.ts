import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export type accessPerms = {
    users: string[];
    roles: string[];
}

/**
 * Base Class for command
 * @abstract metadata: SlashCommandBuilder - General information about the command and is used to register the command
 * @abstract access?: accessPerms - Command access permissions, overrides the one that's set in guild; thus, only use when needed
 * @abstract execute: (interaction: CommandInteraction) => Promise<void> - The function that will be executed when the command is called
 * @abstract enabled?: boolean - Whether the command is enabled or not
 */
export abstract class baseCommand {
    public abstract metadata: SlashCommandBuilder;
    public abstract access?: accessPerms;
    public abstract execute: (interaction: CommandInteraction) => Promise<void>;
    public abstract enabled?: boolean;
}