import { ActivityType, Client, GatewayIntentBits, Partials, DefaultWebSocketManagerOptions } from "discord.js";
import config from '../config.json';
import { PrismaClient } from "@prisma/client";
import { suppressTracing } from "@sentry/node";
import Redis from "ioredis";
import { eventLogger } from "./helper/eventLogger";
import { DiscordEvents, RedisEvents } from "../events";

import { unverifyKickLoader, ReactRoleLoader } from "../services";
import { baseClient } from "./baseClient";
import { DiscordCommandHandler } from "../events/helper/DiscordCommandHandler";
import { TwitchClient } from "./TwitchClient";
import { YoutubeClient } from "./YoutubeClient";




/**
 * Integrated Discord Client
 * @class DiscordClient
 * @property {PrismaClient} prisma - Prisma ORM Client
 * @property {RedisClientType} redis - Redis Client
 * @property {eventLogger} logger - Event Logger
 * @property {config} config - Configuration
 * @method start - Start the client
 * @method dispose - Stop the client and dispose the resources
 * @method updateStatus - Update the status of the bot
 */
export class DiscordClient extends Client implements baseClient {
  config = config;
  prisma: PrismaClient;
  redis: Redis;
  logger: eventLogger;
  twitch: TwitchClient;
  youtube: YoutubeClient;
  trimCommitHash: string;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.User,
      ]
    });

    // Initalize fields
    this.trimCommitHash = process.env['COMMITHASH'] ?? "???";
    if(this.trimCommitHash && this.trimCommitHash.length > 7)
      this.trimCommitHash = this.trimCommitHash.substring(0, 7);

    // Initalize components
    this.logger = new eventLogger(this);
    this.redis = new Redis((process.env["ISDOCKER"] && !process.env["REDIS_CONN"]) ?
      "redis://redis:6379" : process.env["REDIS_CONN"] ?? "", {
      keyPrefix: `${this.config.redisPrefix}:`,
      enableReadyCheck: false,
    });
    this.prisma = new PrismaClient({
      errorFormat: "minimal"
    });

    //@ts-expect-error Override readonly property
    DefaultWebSocketManagerOptions.identifyProperties.browser = "Discord iOS";
    
    new DiscordEvents(this)
      .registerEvents();
    new RedisEvents(this)
      .registerEvents();

    // Initialize Twitch Client
    if(!process.env["TWITCH_TOKEN"] || !process.env["TWITCH_USERNAME"])
      throw new Error("No twitch username/token provided");
    this.twitch = new TwitchClient(this, process.env["TWITCH_USERNAME"], process.env["TWITCH_TOKEN"]);

    // Initalize Youtube Client
    const port = process.env["WEBSERVER_PORT"];
    this.youtube = new YoutubeClient({
      client: this,
      https: process.env["WEBSERVER_HTTPS"] === "true",
      FQDN: process.env["WEBSERVER_FQDN"] || "",
      Port: !port || Number.isNaN(parseInt(port)) ? undefined : parseInt(port),
      PubSubPort: this.config.youtube.overridePort !== 0 ? this.config.youtube.overridePort : undefined,
      Path: "/UwU/youtube/callback/",
      secret: process.env["YTSECRET"]
    });

  }

  public async start(token: string) {
    // Connect all services
    await this.prisma.$connect();
    if(this.redis.status === "close")
      await this.redis.connect();
    await this.login(token);
    // Start all services
    await new DiscordCommandHandler(this).commandRegister();
    await this.loadServices();
    this.updateStatus();
    
    // Start helper clients
    await this.twitch.start();
    await this.youtube.start();
  }

  public async dispose() {
    return await suppressTracing(async() => {
      // Close all connections
      await this.prisma.$disconnect();
      await this.redis.quit();
      await this.destroy();
    });
  }

  public updateStatus() {
    this.user?.setPresence({
      status: "online",
      activities: [{
        name: `${this.guilds.cache.find(g=>g.id===this.config.guildID)?.memberCount} cuties :Þ | ver ${this.trimCommitHash}`,
        type: ActivityType.Watching,
      }],
    });
  }

  private async loadServices() {
    await ReactRoleLoader(this);
    await (new unverifyKickLoader(this)).load();
  }
  
}