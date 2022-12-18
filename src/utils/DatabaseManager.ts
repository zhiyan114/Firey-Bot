import { PrismaClient } from "@prisma/client";
import { LogType, sendLog } from "./eventLogger";
import Sentry from '@sentry/node'
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

let prisma: PrismaClient | undefined;
try {
  prisma = new PrismaClient();
  console.log("Database Connected...");
  sendLog(LogType.Info,"Database Connection Established");
} catch(ex) {
  if(ex instanceof PrismaClientKnownRequestError) sendLog(LogType.Error, `Database Connection Error: ${ex.code} occurred`);
  else {
    sendLog(LogType.Warning, `Unknown Database Connection Error Occurred`)
    Sentry.captureException(ex);
  }
}

export {prisma}