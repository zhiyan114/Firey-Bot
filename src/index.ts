import * as fs from 'fs';
import * as path from 'path';
import { Client, Intents, Interaction, GuildMember } from 'discord.js';
import * as definition from './interface';
import * as Sentry from '@sentry/node';
import * as config from '../config.json';
import { initailizeLogger, sendLog, LogType, LogMetadata } from './utils/eventLogger';
/* Internal Services */
import CmdRegister from './services/CmdRegister';
import ReactRole from './services/ReactRoleHandler';
import VerifyHandler from './services/VerificationHandler';
import UserJoinHandler from './services/UserJoinHandler';
import YouTubeNotifier from './services/youtubeNotification';

// Pre-Load Services
Sentry.init({
  dsn: "https://4674d92fdd22407a8af689f4d869b77e@o125145.ingest.sentry.io/6372351"
});

// Internal Interface
interface ICommandList {
    [key: string]: definition.ICommand;
}

/* Load all the internal commands */
const commandList : ICommandList = {};
const cmdDir = path.join(__dirname, 'commands');
fs.readdirSync(cmdDir).forEach(file => {
  if (file.endsWith('.js')) {
      const cmdModule : definition.ICommand = require(path.join(cmdDir, file)).default;
      if(!cmdModule.disabled) commandList[cmdModule.command.name] = cmdModule;
  }
});
CmdRegister(Object.values(commandList)); // Register all the slash commands

/* Client Loader */
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MEMBERS], partials: ["CHANNEL"] });

client.on('ready', async () => {
  client.user.setPresence({
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
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('guildMemberAdd',async (member : GuildMember) => {
  await UserJoinHandler(member, client);
});

client.on('interactionCreate', async (interaction : Interaction) => {
  if (interaction.isCommand()) {
    const command = commandList[interaction.commandName];
    if (!command) return;
    await command.function(interaction, client);
  } else if(interaction.isButton()) {
    if(interaction.customId === "RuleConfirm") return await VerifyHandler(interaction);
  }
});


client.login(config['botToken']);