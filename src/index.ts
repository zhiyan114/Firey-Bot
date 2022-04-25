import * as fs from 'fs';
import * as path from 'path';
import { Client, Intents, MessageEmbed, MessageReaction, TextChannel, User } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import * as definition from './interface';
import * as config from '../config.json';
/* Internal Services */
import CmdRegister from './services/CmdRegister';
import ReactRole from './services/ReactRoleHandler';

// Internal Interface
interface ICommandList {
    [key: string]: definition.ICommand;
}


const commandList : ICommandList = {};
/* Load all the internal commands */
const cmdDir = path.join(__dirname, 'commands');
fs.readdirSync(cmdDir).forEach(file => {
  if (file.endsWith('.js')) {
      const cmdModule : definition.ICommand = require(path.join(cmdDir, file));
      if(!cmdModule.disabled) commandList[cmdModule.command.name] = cmdModule;
  }
});

CmdRegister(Object.values(commandList)); // Register all the slash commands

/* Client Loader */
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MEMBERS], partials: ["CHANNEL"] });

client.on('ready', async () => {
  client.user.setPresence({
    status: "idle",
    activities: [{
      name: "all furries UwU",
      type: "WATCHING",
    }]
  })
  await ReactRole(client);
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    if (!commandList[interaction.commandName]) return;
    await commandList[interaction.commandName].function(interaction);
  }
});


client.login(config['botToken']);