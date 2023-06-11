/**
 * This command registers all the commands globally. 
 * This file should be called manually as it has 1 hour of cooldown compare to the guild specific change, which doesn't.
 */

import path from "path";
import fs from 'fs';
import { ICommand } from "./interface";
import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from "discord.js";
import { botToken, clientID } from "./config";

/* Load all the internal commands */
console.log("Loading Commands...")
const commandList : RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const cmdDir = path.join(__dirname, './', 'commands');
for(let file of fs.readdirSync(cmdDir)) {
    if (file.endsWith('.js')) {
        const cmdModule : ICommand = require(path.join(cmdDir, file)).default;
        if(!cmdModule) continue;
        if(!cmdModule.disabled) commandList.push(cmdModule.command.toJSON());
    }
}

// Enable/Update the command globally
console.log(`${commandList.length} commands enabled! Registering Commands...`)
const rest = new REST({ version: '10' }).setToken(botToken);
rest.put(
    Routes.applicationCommands(clientID),
    { body: commandList },
).then(()=> console.log("Done"));