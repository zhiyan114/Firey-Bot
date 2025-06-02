import { DiscordClient } from "./core/DiscordClient";
import {
  consoleLoggingIntegration,
  extraErrorDataIntegration,
  rewriteFramesIntegration,
  init as sentryInit,
  flush
} from "@sentry/node"; /* track https://github.com/getsentry/sentry-javascript/issues/15213 */
import { config as dotenv } from "dotenv";
import { beforeSend, beforeBreadcrumb, frameStackIteratee } from "./SentryFuncs";

dotenv();

/**
 * Sentry Initialization
 */
sentryInit({
  dsn: process.env["SENTRY_DSN"],
  dist: process.env['COMMITHASH'],
  maxValueLength: 1000,
  tracesSampleRate: 0,
  sendDefaultPii: true,

  beforeBreadcrumb,
  beforeSend,
  beforeSendTransaction: () => null,
  // @ts-expect-error Bad Type Definition (track: https://github.com/getsentry/sentry-javascript/pull/16439)
  beforeSendSpan: () => null,

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

  // Sentry New Feature Testing
  _experiments: {
    enableLogs: true,
    beforeSendLog(log) {
      return log;
    },
  },

  integrations: [
    consoleLoggingIntegration({
      levels: ["error", "warn", "log"],
    }),
    extraErrorDataIntegration({
      depth: 5
    }),
    rewriteFramesIntegration({
      iteratee: frameStackIteratee
    })
  ],
});

/**
 * Start up checks
 */
if(!process.env["BOTTOKEN"])
  throw new Error("No token provided");

/**
 * Setup our beloved client stuff and start it
 */
const CoreClient = new DiscordClient();
CoreClient
  .start(process.env["BOTTOKEN"])
  .then(()=>console.log("Bot started"));

/**
 * Handle cleanups
 */
async function quitSignalHandler() {
  // Log initial shutdown message
  await CoreClient.logger.sendLog({
    type: "Info",
    message: "Shutdown Initiated... View logs for shutdown completion."
  });
  console.log("Shutdown Initiated...");

  // Perform cleanup
  await CoreClient.dispose();
  await CoreClient.twitch.dispose();
  await CoreClient.youtube.dispose();
  await flush(15000);

  // Complete the shutdown
  console.log("Shutdown Complete!");
  process.exit(0);
}

process.on("SIGINT", quitSignalHandler);
process.on("SIGTERM", quitSignalHandler);
process.on("SIGQUIT", quitSignalHandler);