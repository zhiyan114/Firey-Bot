import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction } from 'discord.js';

export interface ICommand {
    command: SlashCommandBuilder;
    function: (interaction: CommandInteraction) => Promise<void>;
    disabled?: boolean;
}