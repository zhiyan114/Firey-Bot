import { Db, MongoClient, ServerApiVersion } from "mongodb";
import { LogType, sendLog } from "./eventLogger";
export const dbclient = new MongoClient(process.env['MONGODB_CONN'] as string, {
  sslKey: process.env['MONGODB_CERT'],
  sslCert: process.env['MONGODB_CERT'],
  serverApi: ServerApiVersion.v1,
});
export let isConnected = false;
export let database: Db;
dbclient.connect().then(()=>{
  isConnected = true;
  database = dbclient.db("guildMembers");
  sendLog(LogType.Info,"Database Connection Established");
})
