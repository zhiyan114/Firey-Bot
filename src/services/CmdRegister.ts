import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ICommand } from '../interface';
import * as config from '../../config.json';
import * as path from 'path';
import * as fs from 'fs';
import { SlashCommandBuilder } from '@discordjs/builders';
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types";

export default (commands : ICommand[]) => {
    const cmdList : RESTPostAPIApplicationCommandsJSONBody[] = [];
    commands.forEach(cmd => {
        if(!cmd.disabled) cmdList.push(cmd.command.toJSON());
    });
    const rest = new REST({ version: '9' }).setToken(config['botToken']);
    rest.put(
        Routes.applicationGuildCommands(config['clientID'], config['serverID']),
        { body: cmdList },
    );
}