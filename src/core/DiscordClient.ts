import { ActivityType, Client, GatewayIntentBits, Partials } from "discord.js";
import config from '../config.json';
import { PrismaClient } from "@prisma/client";
import { RedisClientType, createClient } from "redis";
import { connect, Connection } from "amqplib";
import { eventLogger } from "../utils/eventLogger";
import { DiscordEvents } from "../events/discordEvents";
import { RedisEvents } from "../events/redisEvents";
import { AMQPEvents } from "../events/amqpEvents";


/**
 * Integrated Discord Client
 * @class DiscordClient
 * @property {PrismaClient} prisma - Prisma ORM Client
 * @property {RedisClientType} redis - Redis Client
 * @property {Connection} amqp - AMQP Connection
 * @property {eventLogger} logger - Event Logger
 * @property {config} config - Configuration
 * @method start - Start the client
 * @method dispose - Stop the client and dispose the resources
 * @method updateStatus - Update the status of the bot
 */
export class DiscordClient extends Client {
  config = config;
  prisma: PrismaClient;
  redis: RedisClientType;
  amqp?: Connection;
  logger: eventLogger;
  events;

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
    
    // Initialize Events
    this.events = {
      amqp: new AMQPEvents(this)
    };
    new DiscordEvents(this)
      .registerEvents();
    new RedisEvents(this)
      .registerEvents();
  }

  public async start(token: string) {
    await this.login(token);
    if(process.env["AMQP_CONN"]) {
      this.amqp = await connect(process.env["AMQP_CONN"]);
      this.events.amqp.registerEvents();
    }
    await this.prisma.$connect();
    this.updateStatus();
  }

  public async dispose() {
    // Close all connections
    await this.prisma.$disconnect();
    await this.redis.disconnect();
    if(this.amqp) {
      this.events.amqp.noAutoReconnect = true;
      await this.amqp.close();
    }
    await this.destroy();
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