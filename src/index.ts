
import { Client, Intents } from 'discord.js';
import * as Sentry from '@sentry/node';
import * as config from '../config.json';
import { initailizeLogger, sendLog, LogType } from './utils/eventLogger';
/* Internal Services */
import './services/CmdHandler';
import ReactRole from './services/ReactRoleHandler';
import './services/VerificationHandler';
import './services/UserJoinHandler';
import YouTubeNotifier from './services/youtubeNotification';

// Pre-Load Services
Sentry.init({
  dsn: "https://4674d92fdd22407a8af689f4d869b77e@o125145.ingest.sentry.io/6372351"
});

/* Client Loader */
export const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MEMBERS], partials: ["CHANNEL"] });
client.on('ready', async () => {
  client.user!.setPresence({
    status: "dnd",
    activities: [{
      name: "all dergs UwU",
      type: "WATCHING",
    }]
  })
  await initailizeLogger(client);
  await ReactRole(client);
  YouTubeNotifier(client);
  await sendLog(LogType.Info, "Discord.js client has been initialized!");
  console.log(`Logged in as ${client.user!.tag}!`);
});

// Start the client
client.login(config['botToken']);