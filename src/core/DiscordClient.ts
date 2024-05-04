import { ActivityType, Client, GatewayIntentBits, Partials, DiscordAPIError } from "discord.js";
import { APIErrors } from "../utils/discordErrorCode";
import config from '../config.json';
import { PrismaClient } from "@prisma/client";
import { RedisClientType, createClient } from "redis";
import { connect, Connection } from "amqplib";
import { eventLogger } from "./helper/eventLogger";
import { DiscordEvents, RedisEvents, AMQPEvents } from "../events/";

import { init as sentryInit, Integrations } from "@sentry/node";
import { extraErrorDataIntegration, rewriteFramesIntegration } from "@sentry/integrations";
import { Prisma } from "@prisma/client";
import path from "path";
import { ReactRoleLoader } from "../services/ReactRoleHandler";
import { baseClient } from "./baseClient";
import { DiscordCommandHandler } from "../events/helper/DiscordCommandHandler";


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

    // Start Sentry
    if(process.env["SENTRY_DSN"])
      this.initSentry();
  }

  public async start(token: string) {
    // Connect all services
    await this.prisma.$connect();
    await this.redis.connect();
    await this.login(token);
    await this.logger.initalize();

    if(process.env["AMQP_CONN"]) {
      this.amqp = await connect(process.env["AMQP_CONN"]);
      this.events.amqp.registerEvents();
    }

    // Start all services
    await new DiscordCommandHandler(this).commandRegister();
    await this.loadServices();
    this.updateStatus();
    await this.logger.sendLog({
      type: "Info",
      message: "Discord client has been initialized!"
    });
    
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
    const commitHash = process.env['commitHash'];
    this.user?.setPresence({
      status: "dnd",
      activities: [{
        name: `on release ${commitHash ?? "???"} with ${this.guilds.cache.find(g=>g.id===this.config.guildID)?.memberCount} cuties :Þ`,
        type: ActivityType.Listening,
      }]
    });
  }

  private initSentry() {
    sentryInit({
      dsn: process.env["SENTRY_DSN"],
      maxValueLength: 1000,
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
        new Integrations.Prisma({client: this.prisma})
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
        "ENOTFOUND"
      ],
      beforeSend : (evnt, hint) => {
        if(evnt.tags && evnt.tags["isEval"]) return null;
    
        const ex = hint.originalException;
        if(ex instanceof DiscordAPIError && ex.code === APIErrors.UNKNOWN_INTERACTION) return null;
        // Somehow prisma bugged and threw this error :/
        if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P1017") return null;
        return evnt;
      },
      release: process.env['commitHash']
    });
  }

  private async loadServices() {
    await ReactRoleLoader(this);
  }
  
}