/* Software Loader */

// Load Env Variable
import {config as dotenv} from "dotenv";
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
import { expressIntegration, extraErrorDataIntegration, prismaIntegration, redisIntegration, rewriteFramesIntegration, init as sentryInit } from "@sentry/node";
import { DiscordAPIError } from "discord.js";
import { relative } from "path";
import { APIErrors } from "./utils/discordErrorCode";
import { Prisma } from "@prisma/client";

sentryInit({
  dsn: process.env["SENTRY_DSN"],
  maxValueLength: 1000,
  tracesSampleRate: 0.8,
  
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
    redisIntegration(),
    expressIntegration(),
  ],
      
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
  
  beforeSendTransaction: (transaction) => {
    // Ignore callback stuff from PubSubHubbub
    if(transaction.transaction == "POST /UwU/youtube/callback/")
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

const provider = new NodeTracerProvider({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "Firey's Bot",
  }),
});
provider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter()));

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new PrismaInstrumentation(),
    new IORedisInstrumentation(),
  ],
});
provider.register();

// Start the main software
//import './index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./index"); // Workaround for esbuild's non-order transpilation