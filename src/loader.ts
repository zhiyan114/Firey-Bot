/* Software Loader */

// Load Env Variable
import {config as dotenv} from "dotenv";
dotenv();

// Run Sentry first as required by the docs
import { 
  consoleLoggingIntegration,
  expressIntegration, 
  extraErrorDataIntegration, 
  prismaIntegration, 
  redisIntegration, 
  rewriteFramesIntegration, 
  init as sentryInit, 
} from "@sentry/node";
import { DiscordAPIError, DiscordjsError } from "discord.js";
import { relative } from "path";
import { APIErrors } from "./utils/discordErrorCode";
import { Prisma } from "@prisma/client";
import { redisPrefix } from "./config.json";
import {errors} from 'undici';

sentryInit({
  dsn: process.env["SENTRY_DSN"],
  maxValueLength: 1000,

  // Sentry New Feature Testing
  _experiments: {
    enableLogs: true,
    beforeSendLog(log) {
      return log;
    },
  },
  
  integrations: [
    consoleLoggingIntegration({
      levels: ["error", "warn", "log"], // ! Beta integration !
    }),
    extraErrorDataIntegration({
      depth: 5
    }),
    rewriteFramesIntegration({
      iteratee: (frame) => {
        const absPath = frame.filename;
        if(!absPath) return frame;
        // Set the base path as the dist output to match the naming artifact on sentry
        frame.filename = `/${relative(__dirname, absPath).replace(/\\/g, "/")}`;
        return frame;
      }
    }),
    prismaIntegration(),
    redisIntegration({cachePrefixes: [`${redisPrefix}:`]}),
    expressIntegration(),
  ],
      
  beforeBreadcrumb: (breadcrumb) => {
    // List of urls to ignore
    const ignoreUrl = [
      "https://api.twitch.tv",
      //"https://discord.com",
      //"https://cdn.discordapp.com",
      "https://o125145.ingest.sentry.io", // Why is sentry being added to BC?????
    ];
      
    // Ignore Http Breadcrumbs from the blacklisted url
    if(breadcrumb.category === "http" && 
      ignoreUrl.find(url=>breadcrumb.data?.url.startsWith(url))) return null;
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
    "getaddrinfo"
  ],
  
  beforeSend : (evnt, hint) => {
    const ex = hint.originalException;
    
    // Ignore the unhandlable errors
    if(ex instanceof DiscordAPIError && ex.code === APIErrors.UNKNOWN_INTERACTION) return null; // Nothing we can do, really...
    if(ex instanceof DiscordjsError && ex.code === "GuildMembersTimeout") return null; // Known issue with discord's backend API
    if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P1017") return null; // Somehow...
    if(ex instanceof Error && ex.message.includes('Could not load the "sharp"')) return null; // Holy Hell, sharp...
    if(ex instanceof errors.SocketError && ex.message === "other side closed") return null; // Probably just discord's WS downtime
    
    return evnt;
  },

  tracesSampler: (ctx) => {
    // This will be messy anyway
    if(ctx.name === "Chat Reward Points")
      return 0.2;
    if(ctx.name == "Discord Command: eval") // Doesn't make sense to have this sampled lol
      return 0;
    return 1;

  },
  
  beforeSendTransaction: (transaction) => {
    // Ignore callback stuff from PubSubHubbub
    if(new RegExp("/UwU/youtube/callback/").test(transaction.transaction ?? ""))
      return null;
    if(new RegExp("/test/").test(transaction.transaction ?? ""))
      return null;
    // Drop Prisma only transactions
    if(transaction.transaction?.startsWith("prisma:"))
      return null;
    
    return transaction;
  },
  
  release: process.env['COMMITHASH'],
  environment: process.env["ENVIRONMENT"]
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./index"); // Workaround for esbuild's non-order transpilation

// Start the main software
//import './index';