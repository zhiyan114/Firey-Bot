//const sqlite = require('sqlite');
//const sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');
const { Client, Intents, MessageEmbed } = require('discord.js');
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
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MEMBERS] });

client.on('ready', () => {
  //client.user.setActivity('everyone below me', { type: 'WATCHING' });
  //client.user.setStatus('idle');
  client.user.setPresence({
    status: "idle",
    activities: [{
      name: "all furries UwU",
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
client.on('message',async(message)=>{
  // Check if the message is from this client
  if (message.author.id === client.user.id) return;
  // Check if the message is from DM
  if (message.channel.type != 'dm') return;
  // Get member from user ID
  const guild = await client.guilds.cache.find(opt=>opt.id == "906899666656956436")
  const member = guild.members.fetch();
  if(message.content.toLowerCase() === "I agree with the rules") {
  }
});

client.login('OTYzNDIwODYyNDgzMTQ0NzM1.YlV1mQ.06-w0uXaPMtmjKIDgs2gFgoCjMQ');