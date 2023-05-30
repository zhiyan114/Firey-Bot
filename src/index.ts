// Components
import { Client, GatewayIntentBits as Intents, Partials, ActivityType } from 'discord.js';
import {init as sentryInit} from '@sentry/node';
import { ExtraErrorData } from "@sentry/integrations";
import {botToken, guildID, twitch} from './config';
import { initailizeLogger, sendLog, LogType } from './utils/eventLogger';
import { prisma } from './utils/DatabaseManager';
import { twitchClient as tStreamClient } from './utils/twitchStream';
import { redis as rClient } from './utils/DatabaseManager';

// Load sentry if key exists
if(process.env['SENTRY_DSN']) {
  sendLog(LogType.Info,"Sentry DSN Detected, Error and Performance Logging will be enabled")
  sentryInit({
    dsn: process.env['SENTRY_DSN'],
    integrations: [
      new ExtraErrorData({
        depth: 3
      })
    ],
    beforeSend : (evnt) => { 
      if(evnt.tags && evnt.tags['isEval']) return null;
      return evnt;
    },
  });
}

/* Client Loader */
export const client = new Client({ intents: [Intents.Guilds, Intents.GuildMessageReactions, Intents.GuildModeration, Intents.GuildMembers, Intents.MessageContent, Intents.GuildMessages, Intents.GuildPresences], partials: [Partials.Channel, Partials.GuildMember, Partials.User] });
export const streamCli = new tStreamClient(twitch.channel);
/* Internal Services */
import { loadClientModule } from './services'

client.on('ready', async () => {
  client.user!.setPresence({
    status: "dnd",
    activities: [{
      name: `with ${client.guilds.cache.find(g=>g.id===guildID)?.memberCount} cuties :3`,
      type: ActivityType.Competing,
    }]
  })
  await initailizeLogger(client);
  await loadClientModule(client);
  await sendLog(LogType.Info, "Discord.js client has been initialized!");
  console.log(`Logged in as ${client.user!.tag}!`);
});

// Gracefully close setup
const quitSignalHandler = async () => {
  console.log("Closing Service...");
  // Close Prisma ORM Connections
  if(prisma) await prisma.$disconnect();
  // Close Redis Connections
  if(rClient.isOpen) await rClient.disconnect();
  console.log("Closed...");
  process.exit(0);
}
process.on('SIGINT', quitSignalHandler)
process.on('SIGTERM', quitSignalHandler)
process.on('SIGQUIT', quitSignalHandler)

// Start the client
client.login(botToken);