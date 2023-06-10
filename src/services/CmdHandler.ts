import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { ICommand } from '../interface';
import * as config from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { client } from '../index';
import { GuildMember, Interaction } from 'discord.js'

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

// Add the commands to the server
const rest = new REST({ version: '10' }).setToken(config['botToken']);
rest.put(
    Routes.applicationGuildCommands(config['clientID'], config['guildID']),
    { body: Object.values(commandList).map(cmd=>{ if(!cmd.disabled) return cmd.command.toJSON() }) },
);

// Algorithm to check if user has permission
const hasPerm = (command: ICommand, user: GuildMember) => {
    // User perm check first
    const perm = command.permissions
    if(!perm) return true;
    if(perm.users && perm.users.find(k=>k === user.user.id)) return true;
    if(perm.roles && perm.roles.filter(r => user.roles.cache.find(ur=> ur.id === r)).length > 0) return true;
    return false;
}

// Handles command interactions
client.on('interactionCreate', async (interaction : Interaction) => {
    if (interaction.isCommand()) {
        const command = commandList[interaction.commandName];
        if (!command) return;
        if (!interaction.member) return;
        if (!hasPerm(command, interaction.member as GuildMember)) {interaction.reply({content: "Permission Denied", ephemeral: true}); return;};
        await command.function(interaction);
    }
})