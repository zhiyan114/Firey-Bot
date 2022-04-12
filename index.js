//const sqlite = require('sqlite');
//const sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');
const { Client, Intents } = require('discord.js');
require("./CmdRegister.js");
//const db = require("./DatabaseInit.js");

const commandList = {};
// Load commands from the command directory
const dir = path.join(__dirname, 'commands');
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.js')) {
        const cmdModule = require(path.join(dir, file));
        if(!cmdModule.disabled) commandList[cmdModule.command.name] = cmdModule.function;
    }
});

/* Client Loader */
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

client.on('ready', () => {
  //client.user.setActivity('everyone below me', { type: 'WATCHING' });
  //client.user.setStatus('idle');
  client.user.setPresence({
    status: "idle",
    activities: [{
      name: "all furries that are here",
      type: "WATCHING",
    }]
  })
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    if (!commandList[interaction.commandName]) return;
    await commandList[interaction.commandName](interaction);
  }
});

client.login('OTYzNDIwODYyNDgzMTQ0NzM1.YlV1mQ.06-w0uXaPMtmjKIDgs2gFgoCjMQ');