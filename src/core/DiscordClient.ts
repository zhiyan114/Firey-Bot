import { ActivityType, Client, GatewayIntentBits, Partials, DiscordAPIError, DefaultWebSocketManagerOptions } from "discord.js";
import { APIErrors } from "../utils/discordErrorCode";
import config from '../config.json';
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { connect, Connection } from "amqplib";
import { eventLogger } from "./helper/eventLogger";
import { DiscordEvents, RedisEvents, AMQPEvents } from "../events";

import { init as sentryInit, Integrations, flush, metrics, extraErrorDataIntegration, rewriteFramesIntegration } from "@sentry/node";
import { Prisma } from "@prisma/client";
import path from "path";
import { ReactRoleLoader } from "../services/ReactRoleHandler";
import { baseClient } from "./baseClient";
import { DiscordCommandHandler } from "../events/helper/DiscordCommandHandler";
import { TwitchClient } from "./TwitchClient";
import { YoutubeClient } from "./YoutubeClient";


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
export class DiscordClient extends Client implements baseClient {
  config = config;
  prisma: PrismaClient;
  redis: Redis;
  amqp?: Connection;
  logger: eventLogger;
  events;
  twitch: TwitchClient;
  youtube: YoutubeClient;

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
    this.redis = new Redis((process.env["ISDOCKER"] && !process.env["REDIS_CONN"]) ?
      "redis://redis:6379" : process.env["REDIS_CONN"] ?? "", {
      keyPrefix: this.config.redisPrefix
    });
    this.prisma = new PrismaClient({
      errorFormat: "minimal"
    });

    //@ts-expect-error Override readonly property
    DefaultWebSocketManagerOptions.identifyProperties.browser = "Discord iOS";
    
    // Initialize Events
    this.events = {
      amqp: new AMQPEvents(this)
    };
    new DiscordEvents(this)
      .registerEvents();
    new RedisEvents(this)
      .registerEvents();

    // Start Sentry
    if(process.env["SENTRY_DSN"])
      this.initSentry();

    // Initialize Twitch Client
    if(!process.env["TWITCH_TOKEN"] || !process.env["TWITCH_USERNAME"])
      throw new Error("No twitch username/token provided");
    this.twitch = new TwitchClient(this, process.env["TWITCH_USERNAME"], process.env["TWITCH_TOKEN"]);

    // Initalize Youtube Client
    const port = process.env["WEBSERVER_PORT"];
    this.youtube = new YoutubeClient({
      client: this,
      FQDN: process.env["WEBSERVER_FQDN"] || "",
      Port: !port || Number.isNaN(parseInt(port)) ? undefined : parseInt(port),
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

    if(process.env["AMQP_CONN"]) {
      this.amqp = await connect(process.env["AMQP_CONN"]);
      this.events.amqp.registerEvents();
    }

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
    await this.redis.disconnect();
    if(this.amqp) {
      this.events.amqp.noAutoReconnect = true;
      await this.amqp.close();
    }
    await this.destroy();
    await flush();
  }

  public updateStatus() {
    // Get and trim the commit hash
    let commitHash = process.env['COMMITHASH'];
    if(commitHash && commitHash.length > 7)
      commitHash = commitHash.substring(0, 7);

    this.user?.setPresence({
      status: "online",
      activities: [{
        name: `${this.guilds.cache.find(g=>g.id===this.config.guildID)?.memberCount} cuties :Þ | ver ${commitHash ?? "???"}`,
        type: ActivityType.Watching,
      }],
    });
  }

  private initSentry() {
    sentryInit({
      dsn: process.env["SENTRY_DSN"],
      maxValueLength: 1000,
      tracesSampleRate: 0.1,

      integrations: [
        extraErrorDataIntegration({
          depth: 5
        }),
        rewriteFramesIntegration({
          iteratee: (frame) => {
            const absPath = frame.filename;
            if(!absPath) return frame;
            // Set the base path as the dist output to match the naming artifact on sentry
            frame.filename = `/${path.relative(__dirname, absPath).replace(/\\/g, "/")}`;
            return frame;
          }
        }),
        new Integrations.Prisma({client: this.prisma}),
        metrics.metricsAggregatorIntegration(),
      ],
  
      _experiments: {
        metricsAggregator: true,
      },
    
      beforeBreadcrumb: (breadcrumb) => {
        // List of urls to ignore
        const ignoreUrl = [
          "https://api.twitch.tv",
          "https://discord.com",
          "https://cdn.discordapp.com"
        ];
    
        // Ignore Http Breadcrumbs from the blacklisted url
        if(breadcrumb.category === "http" && 
          ignoreUrl.filter(url=>breadcrumb.data?.url.startsWith(url)).length > 0) return null;
        return breadcrumb;
      },
    
      ignoreErrors: [
        "ETIMEDOUT",
        "EADDRINUSE",
        "ENOTFOUND",
        "TimeoutError",
        "AbortError",
        "NetworkError",
        "ECONNREFUSED",
        "ECONNRESET",
      ],

      beforeSend : (evnt, hint) => {
        const ex = hint.originalException;
        if(ex instanceof DiscordAPIError && ex.code === APIErrors.UNKNOWN_INTERACTION) return null;
        // Somehow prisma bugged and threw this error :/
        if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P1017") return null;
        return evnt;
      },

      release: process.env['COMMITHASH'],
      environment: process.env["ENVIRONMENT"]
    });
  }

  private async loadServices() {
    await ReactRoleLoader(this);
  }
  
}