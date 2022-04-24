//const sqlite = require('sqlite');
//const sentry = require('@sentry/node');
import * as fs from 'fs';
import * as path from 'path';
import { Client, Intents, MessageEmbed, MessageReaction, TextChannel, User } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
//const db = require("./src/services/DatabaseInit.js");

import * as config from '../config.json';



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
  //await require('./src/services/ReactRoleHandler.ts')(client);
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
  }
});


client.login(config['botToken']);