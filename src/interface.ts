import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction } from 'discord.js';

interface ICommand {
    command: SlashCommandBuilder;
    function: (interaction: CommandInteraction, client : Client) => Promise<void>;
    disabled?: boolean;
}
interface IService {
    
}
export { ICommand, IService };