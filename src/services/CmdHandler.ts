import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ICommand } from '../interface';
import * as config from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { client } from '../index';
import { ApplicationCommandPermissions, ApplicationCommandPermissionType, Interaction } from 'discord.js'
import { getAccessToken } from '../utils/discordTokenManager';
import { LogType, sendLog } from '../utils/eventLogger';
import * as Sentry from '@sentry/node'

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
    let accessToken = process.env["DISCORD_REFRESH_TOKEN"];
    if(!guild || !accessToken) return await sendLog(LogType.Warning, "Missing bearer token, command perms may not be updated");
    const registeredCommands = await guild.commands.fetch();
    if(!registeredCommands) return;
    accessToken = await getAccessToken(accessToken);
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
        if(cmdData.permissions.roles)
            for(let roleID of cmdData.permissions.roles) {
                commandPermConfig.push({
                    id: roleID,
                    type: ApplicationCommandPermissionType.Role,
                    permission: true,
                })
            };
        // Loads the users permission
        if(cmdData.permissions.users)
            for(let userID of cmdData.permissions.users) {
                commandPermConfig.push({
                    id: userID,
                    type: ApplicationCommandPermissionType.User,
                    permission: true,
                })
            };
        try {
            await guild.commands.permissions.set({
                command: command.id,
                token: accessToken,
                permissions: commandPermConfig,
            })
        } catch(ex: unknown) {
            await sendLog(LogType.Warning, "An error occured when attempting to set commands permission")
            Sentry.captureException(ex);
            break;
        }
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