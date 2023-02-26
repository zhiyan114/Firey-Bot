import { PrismaClient } from "@prisma/client";
import { LogType, sendLog } from "./eventLogger";
import { captureException } from '@sentry/node'
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { createClient } from "redis";

let prisma: PrismaClient | undefined;
try {
  prisma = new PrismaClient();
  console.log("Prisma Connected...");
  sendLog(LogType.Info,"Prisma Connection Established");
} catch(ex) {
  if(ex instanceof PrismaClientKnownRequestError) sendLog(LogType.Error, `Database Connection Error: ${ex.code} occurred`);
  else {
    sendLog(LogType.Error, `Unknown Prisma Error Occured`)
    captureException(ex);
  }
}
const redis = createClient({
  url: process.env['REDIS_CONN']
});

redis.on('error', err => {
    captureException(err);
    sendLog(LogType.Error, "Redis Client Thrown Exception");
})

redis.connect().then(()=>{
  console.log("Redis Connected")
  sendLog(LogType.Info,"Redis Connection Established");
}).catch(ex=>{
  sendLog(LogType.Error, `Unknown Redis Error Occured`)
  captureException(ex);
})

export {prisma, redis}