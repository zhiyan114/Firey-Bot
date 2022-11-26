// Components
import { Client, GatewayIntentBits as Intents, Partials, ActivityType } from 'discord.js';
import {init as sentryInit} from '@sentry/node';
import {Integrations} from '@sentry/tracing'
import {botToken, guildID, twitch} from './config';
import { initailizeLogger, sendLog, LogType } from './utils/eventLogger';
import Mongoose from 'mongoose';
import { twitchClient as tStreamClient } from './utils/twitchStream';

// Load sentry if key exists
if(process.env['SENTRY_DSN']) {
  sendLog(LogType.Info,"Sentry DSN Detected, Error and Performance Logging will be enabled")
  sentryInit({
    dsn: process.env['SENTRY_DSN'],
    integrations: [new Integrations.Mongo({
      useMongoose: true,
    })],
    beforeSend : (evnt) => { 
      if(evnt.tags && evnt.tags['isEval']) return null;
      return evnt;
    },
    tracesSampleRate: 0.2, // Only send 20% of the total transactions
    //@ts-ignore Missing Type Definition: https://github.com/getsentry/sentry-javascript/pull/6310
    profilesSampleRate: 0.5,
  });
}

/* Client Loader */
export const client = new Client({ intents: [Intents.Guilds, Intents.GuildMessageReactions, Intents.GuildBans, Intents.GuildMembers, Intents.MessageContent, Intents.GuildMessages], partials: [Partials.Channel, Partials.GuildMember, Partials.User] });
export const streamCli = new tStreamClient(twitch.channel);
/* Internal Services */
import { ReactRole, YouTubeNotifier } from './services'

client.on('ready', async () => {
  client.user!.setPresence({
    status: "dnd",
    activities: [{
      name: `with ${client.guilds.cache.find(g=>g.id==guildID)?.memberCount} cuties :3`,
      type: ActivityType.Competing,
    }]
  })
  await initailizeLogger(client);
  await ReactRole(client);
  YouTubeNotifier(client);
  await sendLog(LogType.Info, "Discord.js client has been initialized!");
  console.log(`Logged in as ${client.user!.tag}!`);
});

// Gracefully close setup
const quitSignalHandler = () => {
  console.log("Closing Service...");
  Mongoose.disconnect().then(()=>{
    console.log("Closed...");
    process.exit(0);
  })
}
process.on('SIGINT', quitSignalHandler)
process.on('SIGTERM', quitSignalHandler)
process.on('SIGQUIT', quitSignalHandler)

// Start the client
client.login(botToken);