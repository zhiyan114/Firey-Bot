/* Software Loader */

// Load Env Variable
import {config as dotenv} from "dotenv";
import {redisPrefix} from './config.json';
import {errors} from 'undici';
dotenv();

// Load Commit Hash
import {existsSync, readFileSync} from "fs";
if(process.env["COMMITHASH"] === undefined) {
  // Try to load the commit hash via file
  if(existsSync("commitHash")) {
    console.log(`Loading commit hash from file...`);
    process.env["COMMITHASH"] = readFileSync("commitHash").toString();
  }
  else
    console.warn("No commit hash found!");
}


// Run Sentry first as required by the docs
import { expressIntegration, extraErrorDataIntegration, prismaIntegration, redisIntegration, rewriteFramesIntegration, SentryContextManager, init as sentryInit, validateOpenTelemetrySetup } from "@sentry/node";
import { DiscordAPIError } from "discord.js";
import { relative } from "path";
import { APIErrors } from "./utils/discordErrorCode";
import { Prisma } from "@prisma/client";

const sentryCli = sentryInit({
  dsn: process.env["SENTRY_DSN"],
  maxValueLength: 1000,
  tracesSampleRate: 1.0,
  skipOpenTelemetrySetup: true,
  
  integrations: [
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
    redisIntegration({cachePrefixes: [redisPrefix]}),
    expressIntegration(),
  ],
      
  beforeBreadcrumb: (breadcrumb) => {
    // List of urls to ignore
    const ignoreUrl = [
      "https://api.twitch.tv",
      "https://discord.com",
      "https://cdn.discordapp.com",
      "https://o125145.ingest.sentry.io", // Why is sentry being added to BC?????
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
    
    // Ignore the unhandlable errors
    if(ex instanceof DiscordAPIError && ex.code === APIErrors.UNKNOWN_INTERACTION) return null; // Nothing we can do, really...
    if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P1017") return null; // Somehow...
    if(ex instanceof Error && ex.message.includes('Could not load the "sharp"')) return null; // Holy Hell, sharp...
    if(ex instanceof errors.SocketError && ex.message === "other side closed") return null; // Probably just discord's WS downtime
    
    return evnt;
  },
  
  beforeSendTransaction: (transaction) => {
    // Ignore callback stuff from PubSubHubbub
    if(new RegExp("/UwU/youtube/callback/").test(transaction.transaction ?? ""))
      return null;
    return transaction;
  },
  
  release: process.env['COMMITHASH'],
  environment: process.env["ENVIRONMENT"]
});


// Load OpenTelemetry Config
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { Resource } from '@opentelemetry/resources';
import {
  SentrySpanProcessor,
  SentryPropagator,
  SentrySampler,
} from '@sentry/opentelemetry';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "Firey's Bot",
  }),
  sampler: sentryCli ? new SentrySampler(sentryCli) : undefined
});
provider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter()));
provider.addSpanProcessor(new SentrySpanProcessor());

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new PrismaInstrumentation(),
    new IORedisInstrumentation(),
  ],
});
provider.register({
  propagator: new SentryPropagator(),
  contextManager: new SentryContextManager(),
});
validateOpenTelemetrySetup();

// Start the main software
//import './index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./index"); // Workaround for esbuild's non-order transpilation