import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { ICommand } from "../interface";
import * as fs from "fs";
import * as path from "path";
import { client } from "../index";
import { ChannelType, GuildMember, Interaction } from "discord.js";
import { botToken, clientID, guildID } from "../config";

// Internal Interface
interface ICommandList {
    [key: string]: ICommand;
}

/* Load all the internal commands */
const commandList : ICommandList = {};
const cmdDir = path.join(__dirname, "../", "commands");
for(const file of fs.readdirSync(cmdDir)) {
  if (file.endsWith(".js")) {
    const cmdModule : ICommand = require(path.join(cmdDir, file)).default;
    if(!cmdModule) continue;
    if(!cmdModule.disabled) commandList[cmdModule.command.name] = cmdModule;
  }
}

// Add the commands to the server (**DISABLED BECAUSE OF THE USE OF GLOBAL COMMAND**)
/*
const rest = new REST({ version: '10' }).setToken(botToken);
rest.put(
    Routes.applicationGuildCommands(clientID, guildID),
    { body: Object.values(commandList).map(cmd=>{ if(!cmd.disabled) return cmd.command.toJSON() }) },
);
*/

// Algorithm to check if user has permission
const hasPerm = (command: ICommand, user: GuildMember) => {
  // User perm check first
  const perm = command.permissions;
  if(!perm) return true;
  if(perm.users && perm.users.find(k=>k === user.user.id)) return true;
  if(perm.roles && perm.roles.filter(r => user.roles.cache.find(ur=> ur.id === r)).length > 0) return true;
  return false;
};

// Handles command interactions
client.on("interactionCreate", async (interaction : Interaction) => {
  if (interaction.isCommand()) {
    // User and Command Sanity Check
    if(interaction.user.bot) {interaction.reply({content: "Bot user are not allow to execute commands", ephemeral: true}); return;}
    if(interaction.isUserContextMenuCommand() && interaction.targetUser.bot) 
    {interaction.reply({content: "Commands cannot be executed on a bot user", ephemeral: true}); return;}
    const command = commandList[interaction.commandName];
    if (!command) return;

    // Ignore Perm Check for DM commands
    if(interaction.channel?.type === ChannelType.DM) {await command.function(interaction); return;}
        
    // Get the member
    const member = interaction.member;
    if(!member) {interaction.reply({content: "You're not in the correct server or the bot was misconfigured", ephemeral: true}); return;}
        
    // Check perms and then run
    if (!hasPerm(command, member as GuildMember)) {interaction.reply({content: "Permission Denied", ephemeral: true}); return;}
    await command.function(interaction);
  }
});