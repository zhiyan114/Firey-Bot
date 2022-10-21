import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ICommand } from '../interface';
import * as config from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { client } from '../index';
import { ApplicationCommandPermissions, ApplicationCommandPermissionType, Interaction } from 'discord.js'

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

// @TODO: Configure commands' permissions
client.on('ready',async ()=>{
    const guild = client.guilds.cache.find(g=>g.id == config.guildID);
    if(!guild) return;
    const registeredCommands = await guild?.commands.fetch();
    if(!registeredCommands) return;
    for(let [_, command] of registeredCommands) {
        const cmdData = commandList[command.name];
        if(!cmdData || !cmdData.permissions) continue;
        // Set to disable everyone's permission by default if there is a permission configured
        const commandPermConfig: ApplicationCommandPermissions[] = [{
            id: guild.roles.everyone.id,
            type: ApplicationCommandPermissionType.Role,
            permission: false,
        }];
        // Load the roles permission
        for(let roleID of cmdData.permissions.roles) {
            commandPermConfig.push({
                id: roleID,
                type: ApplicationCommandPermissionType.Role,
                permission: true,
            })
        }
        // Loads the users permission
        for(let userID of cmdData.permissions.users) {
            commandPermConfig.push({
                id: userID,
                type: ApplicationCommandPermissionType.User,
                permission: true,
            })
        }
        //command.set
        guild.commands.permissions.set({
            command: '123213123',
            token: config['botToken'],
            permissions: commandPermConfig,
        })
    }
})

// Handles command interactions
client.on('interactionCreate', async (interaction : Interaction) => {
    if (interaction.isCommand()) {
        const command = commandList[interaction.commandName];
        if (!command) return;
        await command.function(interaction);
    }
})