import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ICommand } from '../interface';
import * as config from '../../config.json';


export default (commands : ICommand[]) => {
    const rest = new REST({ version: '9' }).setToken(config['botToken']);
    rest.put(
        Routes.applicationGuildCommands(config['clientID'], config['guildID']),
        { body: commands.map(cmd=>{ if(!cmd.disabled) return cmd.command.toJSON() }) },
    );
}