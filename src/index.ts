// Components
import { Client, GatewayIntentBits as Intents, Partials, ActivityType } from 'discord.js';
import * as Sentry from '@sentry/node';
import {botToken, guildID} from './config';
import { initailizeLogger, sendLog, LogType } from './utils/eventLogger';
import Mongoose from 'mongoose';
import YouTubeNotifier from './services/youtubeNotification';
import ReactRole from './services/ReactRoleHandler';

// Load sentry if key exists
if(process.env['SENTRY_DSN']) {
  sendLog(LogType.Info,"Sentry DSN Detected, Exception Logging will be enabled")
  Sentry.init({
    dsn: process.env['SENTRY_DSN']
  });
}

/* Client Loader */
export const client = new Client({ intents: [Intents.Guilds, Intents.GuildMessageReactions, Intents.GuildBans, Intents.GuildMembers, Intents.MessageContent, Intents.GuildMessages], partials: [Partials.Channel, Partials.GuildMember, Partials.User] });

/* Internal Services */
import './services/CmdHandler';
import './services/VerificationHandler';
import './services/UserJoinHandler';
import './services/EconomyHandler';
import './services/userDataHandler';
import './services/TwitchHandler';



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