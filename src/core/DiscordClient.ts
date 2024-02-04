import { ActivityType, Client, GatewayIntentBits, Partials } from "discord.js";
import config from '../config.json';


const mainIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildPresences
];

const mainPartials = [
  Partials.Channel,
  Partials.GuildMember,
  Partials.User
];

export class DiscordClient extends Client {
  config = config;

  constructor() {
    super({
      intents: mainIntents,
      partials: mainPartials
    });
  }

  public async start(token: string) {
    await this.login(token);
  }

  public updateStatus() {
    this.user?.setPresence({
      status: "dnd",
      activities: [{
        name: `with ${this.guilds.cache.find(g=>g.id===this.config.guildID)?.memberCount} cuties :3`,
        type: ActivityType.Competing,
      }]
    });
  }
}