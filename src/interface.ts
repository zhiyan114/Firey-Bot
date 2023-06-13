import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from 'discord.js';

// Supply the role/user ID here for the whitelisted users
export type commandPermOptions = {
    roles?: string[],
    users?: string[],
}

export type ICommand = {
    command: SlashCommandBuilder | ContextMenuCommandBuilder;
    permissions?: commandPermOptions;
    function: (interaction: CommandInteraction | UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction) => Promise<void>;
    disabled?: boolean;
}