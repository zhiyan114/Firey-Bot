import { Db, MongoClient, ServerApiVersion } from "mongodb";
import { LogType, sendLog } from "./eventLogger";

export const dbclient = new MongoClient(process.env['MONGODB_CONN'] as string, {
  serverApi: ServerApiVersion.v1,
  tlsAllowInvalidCertificates: true, // Temp Bypass since cron job throws validation error wwhen it starts.
});
let _isConnected = false;
export let isConnected = () => _isConnected;
export let database: Db;

// Wait before connecting to avoid certificate validation error.
setTimeout(()=>{
  dbclient.connect().then(()=>{
    _isConnected = true;
    database = dbclient.db("guildMembers");
    console.log("Database Connected...");
    sendLog(LogType.Info,"Database Connection Established");
  })
  
}, 1500);