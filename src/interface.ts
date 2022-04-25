import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

interface ICommand {
    command: SlashCommandBuilder;
    function: (interaction: CommandInteraction) => Promise<void>;
    disabled?: boolean;
}
interface IService {
    
}
export { ICommand, IService };