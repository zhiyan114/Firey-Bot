import type { baseClient } from "./baseClient";
import { ActivityType, Client, GatewayIntentBits, Partials, DefaultWebSocketManagerOptions } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { getClient } from "@sentry/node-core";
import Redis from "ioredis";
import { DiscordEvents, RedisEvents } from "../events";
import { DiscordCommandHandler } from "../events/helper/DiscordCommandHandler";
import { TwitchClient } from "./TwitchClient";
import { YoutubeClient } from "./YoutubeClient";
import { unverifyKickLoader, ReactRoleLoader } from "../services";
import { PrismaPg } from "@prisma/adapter-pg";
import { redisPrefix, youtube, guildID } from '../config.json';



/**
 * Integrated Discord Client
 * @class DiscordClient
 * @property {PrismaClient} prisma - Prisma ORM Client
 * @property {RedisClientType} redis - Redis Client
 * @method start - Start the client
 * @method dispose - Stop the client and dispose the resources
 * @method updateStatus - Update the status of the bot
 */
export class DiscordClient extends Client implements baseClient {
  readonly prisma: PrismaClient;
  readonly redis: Redis;
  readonly twitch: TwitchClient;
  readonly youtube: YoutubeClient;
  readonly sysVer: string; // Software Release Version

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

    // Set Versioning
    this.sysVer = getClient()?.getOptions().release ?? "??????";

    // Initalize components
    this.redis = new Redis((process.env["ISDOCKER"] && !process.env["REDIS_CONN"]) ?
      "redis://redis:6379" : process.env["REDIS_CONN"] ?? "", {
      keyPrefix: `${redisPrefix}:`,
      enableReadyCheck: false,
    });
    this.prisma = new PrismaClient({
      errorFormat: "minimal",
      adapter: new PrismaPg({ connectionString: process.env["POSTGRESQL_CONN"] })
    });

    // @ts-expect-error Override readonly property
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
      PubSubPort: youtube.overridePort !== 0 ? youtube.overridePort : undefined,
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
    // Close all connections
    await this.prisma.$disconnect();
    await this.redis.quit();
    await this.destroy();
  }

  public updateStatus() {
    this.user?.setPresence({
      status: "online",
      activities: [{
        name: `${this.guilds.cache.find(g=>g.id===guildID)?.memberCount} cuties :Þ | ver ${this.sysVer}`,
        type: ActivityType.Watching,
      }],
    });
  }

  private async loadServices() {
    await ReactRoleLoader(this);
    await (new unverifyKickLoader(this)).load();
  }

}