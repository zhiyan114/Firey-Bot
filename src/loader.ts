import type { Breadcrumb, ErrorEvent, EventHint, StackFrame } from "@sentry/node-core";
import type { Log } from "@sentry/core";
import { relative } from "path";
import { DiscordAPIError, DiscordjsError, HTTPError } from "discord.js";
import { APIErrors } from "./utils/discordErrorCode";
import { Prisma } from "@prisma/client";
import { errors } from 'undici';
import {
  extraErrorDataIntegration,
  rewriteFramesIntegration,
  SentryContextManager,
  init as sentryInit,
  setupOpenTelemetryLogger,
  validateOpenTelemetrySetup,
} from "@sentry/node-core";
import { config as dotenv } from "dotenv";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SentryPropagator, SentrySampler, SentrySpanProcessor } from "@sentry/opentelemetry";
import { context, propagation, trace } from "@opentelemetry/api";

dotenv();


/**
 * Sentry Initialization
 */
const cli = sentryInit({
  dsn: process.env["SENTRY_DSN"],
  dist: process.env['COMMITHASH'],
  maxValueLength: 1000,
  tracesSampleRate: 0,
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
    "getaddrinfo"
  ],

  integrations: [
    extraErrorDataIntegration({
      depth: 5
    }),
    rewriteFramesIntegration({
      iteratee: frameStackIteratee
    })
  ],
});

// OpenTelemetry Loader
if(cli) {
  const provider = new NodeTracerProvider({
    sampler: new SentrySampler(cli),
    spanProcessors: [
      new SentrySpanProcessor(),
    ],
  });

  trace.setGlobalTracerProvider(provider);
  propagation.setGlobalPropagator(new SentryPropagator());
  context.setGlobalContextManager(new SentryContextManager());

  setupOpenTelemetryLogger();
  validateOpenTelemetrySetup();
}


function beforeSend(event: ErrorEvent, hint: EventHint) {
  const ex = hint.originalException;

  // Ignore the unhandlable errors
  if(ex instanceof DiscordAPIError && ex.code === APIErrors.UNKNOWN_INTERACTION) return null; // Nothing we can do, really...
  if(ex instanceof DiscordjsError && ex.code === "GuildMembersTimeout") return null; // Known issue with discord's backend API
  if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P1017") return null; // Somehow...
  if(ex instanceof Error && ex.message.includes('Could not load the "sharp"')) return null; // Holy Hell, sharp...
  if(ex instanceof errors.SocketError && ex.message === "other side closed") return null; // Probably just discord's WS downtime
  if(ex instanceof HTTPError && Math.floor(ex.status/100) === 5) return null; // Discord server-related issue

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

function frameStackIteratee(frame: StackFrame) {
  const absPath = frame.filename;
  if(!absPath) return frame;

  // Set the base path as the dist output to match the naming artifact on sentry
  frame.filename = `/${relative(__dirname, absPath).replace(/\\/g, "/")}`;
  return frame;
}

function beforeSendLog(log: Log) {
  console.log(`[${log.level}]: ${log.message}`);
  return log;
}