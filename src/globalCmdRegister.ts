/**
 * This command registers all the commands globally. 
 * This file should be called manually as it has 1 hour of cooldown compare to the guild specific change, which doesn't.
 */

import path from "path";
import fs from 'fs';
import { ICommand } from "./interface";
import { REST, Routes } from "discord.js";
import { botToken, clientID } from "./config";

// Key type
interface ICommandList {
    [key: string]: ICommand;
}

/* Load all the internal commands */
console.log("Loading Commands")
const commandList : ICommandList = {};
const cmdDir = path.join(__dirname, './', 'commands');
for(let file of fs.readdirSync(cmdDir)) {
    if (file.endsWith('.js')) {
        const cmdModule : ICommand = require(path.join(cmdDir, file)).default;
        if(!cmdModule) continue;
        if(!cmdModule.disabled) commandList[cmdModule.command.name] = cmdModule;
    }
}

// Add the commands to the server
console.log("Registering Commands")
const rest = new REST({ version: '10' }).setToken(botToken);
rest.put(
    Routes.applicationCommands(clientID),
    { body: Object.values(commandList).map(cmd=>{ if(!cmd.disabled) return cmd.command.toJSON() }) },
);

console.log("Done")