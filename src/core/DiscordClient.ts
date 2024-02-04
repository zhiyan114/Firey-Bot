import { ActivityType, Client, GatewayIntentBits, Partials } from "discord.js";
import config from '../config.json';
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";
import { connect, Connection } from "amqplib";


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
  prisma = new PrismaClient({
    errorFormat: "minimal"
  });
  redis = createClient({
    url: !process.env["REDIS_CONN"] ? "redis://redis:6379" : process.env["REDIS_CONN"],
  });
  amqp?: Connection;

  constructor() {
    super({
      intents: mainIntents,
      partials: mainPartials
    });
  }

  public async start(token: string) {
    await this.login(token);
    if(process.env["AMQP_CONN"])
      this.amqp = await connect(process.env["AMQP_CONN"]);
    await this.prisma.$connect();
    this.updateStatus();
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