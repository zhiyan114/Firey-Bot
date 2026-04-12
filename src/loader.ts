import type { Breadcrumb, ErrorEvent, EventHint } from "@sentry/node";
import type { Log } from "@sentry/core";
import { DiscordAPIError, DiscordjsError, HTTPError } from "discord.js";
import { APIErrors } from "./utils/discordErrorCode";
import { Prisma } from "@prisma/client";
import {
  extraErrorDataIntegration,
  init as sentryInit,
} from "@sentry/node";
import { config as dotenv } from "dotenv";

dotenv();

/**
 * Sentry Initialization
 */
sentryInit({
  dsn: process.env["SENTRY_DSN"],
  dist: process.env['COMMITHASH'],
  maxValueLength: 1000,
  tracesSampleRate: 1,
  sendDefaultPii: true,
  enableLogs: true,
  enableMetrics: true,

  beforeBreadcrumb,
  beforeSend,
  beforeSendLog,

  ignoreErrors: [
    "ETIMEDOUT",
    "EADDRINUSE",
    "ENOTFOUND",
    "TimeoutError",
    "AbortError",
    "NetworkError",
    "ECONNREFUSED",
    "ECONNRESET",
    "getaddrinfo",
    "other side closed",
    'Could not load the "sharp"', // container complaining about sharp for no reason before :pensive:
    "GatewayRateLimitError"
  ],

  integrations: [
    extraErrorDataIntegration({
      depth: 5
    })
    // rewriteFramesIntegration({
    //   iteratee: frameStackIteratee
    // })
  ],
});


function beforeSend(event: ErrorEvent, hint: EventHint) {
  const ex = hint.originalException;

  // Ignore the unhandlable errors
  if(ex instanceof DiscordAPIError && ex.code === APIErrors.UNKNOWN_INTERACTION) return null; // Nothing we can do, really...
  if(ex instanceof DiscordjsError && ex.code === "GuildMembersTimeout") return null; // Known issue with discord's backend API
  if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P1017") return null; // Somehow...
  if(ex instanceof HTTPError && Math.floor(ex.status/100) === 5) return null; // Discord server-related issue

  // Ignore specific chained exceptions (such as ECONNRESET) for exception issued by functions like fetch
  if(ex instanceof Error && ex.cause instanceof Error) {
    const title = ex.cause.name;
    const message = ex.cause.message;
    if(title.includes("ECONNRESET") || message.includes("ECONNRESET")) return null;
    if(title.includes("ETIMEDOUT") || message.includes("ETIMEDOUT")) return null;
  }

  return event;
}

function beforeBreadcrumb(breadcrumb: Breadcrumb) {
  // List of urls to ignore
  const ignoreUrl = [
    "https://api.twitch.tv"
  ];

  // Ignore Http Breadcrumbs from the blacklisted url
  if(breadcrumb.category === "http" &&
    ignoreUrl.find(url=>breadcrumb.data?.url.startsWith(url))) return null;
  return breadcrumb;
}

// function frameStackIteratee(frame: StackFrame) {
//   const absPath = frame.filename;
//   if(!absPath) return frame;

//   // Set the base path as the dist output to match the naming artifact on sentry
//   frame.filename = `/${relative(__dirname, absPath).replace(/\\/g, "/")}`;
//   return frame;
// }

function beforeSendLog(log: Log) {
  // eslint-disable-next-line no-console
  console.log(`[${log.level}]: ${log.message}`);
  return log;
}