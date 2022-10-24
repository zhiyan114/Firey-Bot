import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

// Supply the role/user ID here for the whitelisted users
export type commandPermOptions = {
    roles?: string[],
    users?: string[],
}

export type ICommand = {
    command: SlashCommandBuilder;
    permissions?: commandPermOptions;
    function: (interaction: CommandInteraction) => Promise<void>;
    disabled?: boolean;
}