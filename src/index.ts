
import { Client, GatewayIntentBits as Intents, Partials, ActivityType } from 'discord.js';
import * as Sentry from '@sentry/node';
import {botToken, guildID} from './config';
import { initailizeLogger, sendLog, LogType } from './utils/eventLogger';

// Load sentry if key exists
if(process.env['SENTRY_DSN']) {
  sendLog(LogType.Info,"Sentry DSN Detected, Exception Logging will be enabled")
  Sentry.init({
    dsn: process.env['SENTRY_DSN']
  });
}

/* Client Loader */
export const client = new Client({ intents: [Intents.Guilds, Intents.GuildMessageReactions, Intents.DirectMessages, Intents.GuildBans, Intents.GuildMembers], partials: [Partials.Channel] });

/* Internal Services */
import './services/CmdHandler';
import ReactRole from './services/ReactRoleHandler';
import './services/VerificationHandler';
import './services/UserJoinHandler';
import YouTubeNotifier from './services/youtubeNotification';

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

// Start the client
client.login(botToken);