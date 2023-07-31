import { PrismaClient } from "@prisma/client";
import { LogType, sendLog } from "./eventLogger";
import { captureException } from "@sentry/node";
import { createClient } from "redis";
import { connect, Connection } from "amqplib";

// Handle Prisma Connections
const prisma: PrismaClient = new PrismaClient({
  errorFormat: "minimal" // Sentry will be used to capture errors instead
});

prisma.$connect().then(()=>sendLog(LogType.Info, "Prisma Connection Established")).catch(ex=>captureException(ex));

// Handle Redis Connection
const redis = createClient({
  url: (process.env["ISDOCKER"] && !process.env["REDIS_CONN"]) ? "redis://redis:6379" : process.env["REDIS_CONN"],
});


redis.on("error", async (err: Error) => {
  if(err.message === "Connection timeout") return;
  if(err.message === "getaddrinfo ENOTFOUND redis") return;
  captureException(err);
  sendLog(LogType.Error, "Redis: Client Thrown Exception");
});

redis.on("ready",()=>{
  console.log("Redis Connected");
  sendLog(LogType.Info,"Redis: Connection Established");
});
redis.on("reconnecting", ()=>{
  console.log("Redis reconnecting...");
  sendLog(LogType.Warning,"Redis: Connection Issue, Reconnecting...");
});

redis.connect().then(()=>{
  console.log("Redis connection attempted");
}).catch(ex=>{
  sendLog(LogType.Error, "Redis: Unknown Error Occured");
  captureException(ex);
});



// Handle amqplib connection. I know it's not a database.
let amqpConn: undefined | Connection;
let amqpIsConnected = false;
// This algorithm will handle the connection and reconnection when needed
const init = async() => {
  if(!process.env["AMQP_CONN"]) return;
  amqpConn = await connect(process.env["AMQP_CONN"]);
  amqpConn.on("error",err=> {
    if((err as Error).message !== "Connection closing") captureException(err);
  });
  amqpConn.on("close",()=>{
    sendLog(LogType.Warning, "AMQP Server disconnected, reconnecting in 5 seconds...");
    amqpIsConnected = false;
    setTimeout(init, 5000);
  });
  amqpIsConnected = true;
  sendLog(LogType.Info, "AMQP Server Connected");
};

const getAmqpConn = async () => {
  if(amqpConn) return amqpConn;
  await init();
  return amqpConn;
};
const getAmqpConnSync = () => amqpConn;
const isAmqpConnected = () => amqpIsConnected;

// Export all the component
export {prisma, redis, getAmqpConn, getAmqpConnSync, isAmqpConnected};