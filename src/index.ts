import { init as sentryInit } from "@sentry/node";
import { extraErrorDataIntegration, rewriteFramesIntegration } from "@sentry/integrations";
import { DiscordAPIError } from "discord.js";
import { APIErrors } from "./utils/discordErrorCode";
import { Prisma } from "@prisma/client";
import { LogType, sendLog } from "./utils/eventLogger";
import path from "path";
import { existsSync, readFileSync } from "fs";

/**
 * Initalize Sentry to catch those pesky creatures ^w^
 */
if(process.env["SENTRY_DSN"]) {
  sendLog(LogType.Info,"Sentry DSN Detected, Error Logging will be enabled");
  sentryInit({
    dsn: process.env["SENTRY_DSN"],
    maxValueLength: 500,
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
      })
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
    release: existsSync("commitHash") ? readFileSync("commitHash").toString() : undefined // Pull Release Data
  });
}