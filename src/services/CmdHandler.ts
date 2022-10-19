import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ICommand } from '../interface';
import * as config from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { client } from '../index';
import { Interaction } from 'discord.js'

// Internal Interface
interface ICommandList {
    [key: string]: ICommand;
}

/* Load all the internal commands */
const commandList : ICommandList = {};
const cmdDir = path.join(__dirname, '../', 'commands');
for(let file of fs.readdirSync(cmdDir)) {
    if (file.endsWith('.js')) {
        const cmdModule : ICommand = require(path.join(cmdDir, file)).default;
        if(!cmdModule) continue;
        if(!cmdModule.disabled) commandList[cmdModule.command.name] = cmdModule;
    }
}

let commands = Object.values(commandList);
const rest = new REST({ version: '10' }).setToken(config['botToken']);
rest.put(
    Routes.applicationGuildCommands(config['clientID'], config['guildID']),
    { body: commands.map(cmd=>{ if(!cmd.disabled) return cmd.command.toJSON() }) },
);
client.on('interactionCreate', async (interaction : Interaction) => {
    if (interaction.isCommand()) {
        const command = commandList[interaction.commandName];
        if (!command) return;
        await command.function(interaction);
    }
})