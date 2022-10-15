import { Db, MongoClient, ServerApiVersion } from "mongodb";
import { LogType, sendLog } from "./eventLogger";

export const dbclient = new MongoClient(process.env['MONGODB_CONN'] as string, {
  serverApi: ServerApiVersion.v1,
  checkServerIdentity: ()=>undefined, // Bypass server checks to hopefully fix cron error
});
let _isConnected = false;
export let isConnected = () => _isConnected;
export let database: Db;

dbclient.connect().then(()=>{
  _isConnected = true;
  database = dbclient.db("guildMembers");
  console.log("Database Connected...");
  sendLog(LogType.Info,"Database Connection Established");
})