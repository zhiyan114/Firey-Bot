import { PrismaClient } from "@prisma/client";
import { LogType, sendLog } from "./eventLogger";
import { captureException } from '@sentry/node'
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { createClient } from "redis";
import { connect, Connection } from "amqplib";

// Handle Prisma Connections
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

// Handle Redis Connection
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

// Handle amqplib connection. I know it's not a database.
let amqpConn: undefined | Connection;

const getAmqpConn = async () => {
  if(amqpConn) return amqpConn;
  if(!process.env['AMQP_CONN']) return;
  amqpConn = await connect(process.env['AMQP_CONN']);
  sendLog(LogType.Info, "AMQP Server Connected")
  return amqpConn;
}
const getAmqpConnSync = () => amqpConn;

// Export all the component
export {prisma, redis, getAmqpConn, getAmqpConnSync}