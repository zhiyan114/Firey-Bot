import { ActivityType, Client, GatewayIntentBits, Partials } from "discord.js";
import config from '../config.json';
import { PrismaClient } from "@prisma/client";
import { RedisClientType, createClient } from "redis";
import { connect, Connection } from "amqplib";
import { eventLogger } from "../utils/eventLogger";


export class DiscordClient extends Client {
  config = config;
  prisma: PrismaClient;
  redis: RedisClientType;
  amqp?: Connection;
  logger: eventLogger;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences
      ],
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
      ]
    });

    // Initalize components
    this.logger = new eventLogger(this);
    this.redis = createClient({
      url: !process.env["REDIS_CONN"] ? "redis://redis:6379" : process.env["REDIS_CONN"],
      
    });
    this.prisma = new PrismaClient({
      errorFormat: "minimal"
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

  private async registerCommands() {

  }
}