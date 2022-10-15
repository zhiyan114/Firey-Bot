import { Db, MongoClient, ServerApiVersion } from "mongodb";
import { LogType, sendLog } from "./eventLogger";

export const dbclient = new MongoClient(process.env['MONGODB_CONN'] as string, {
  serverApi: ServerApiVersion.v1,
});
let _isConnected = false;
export let isConnected = () => _isConnected;
export let database: Db;
dbclient.connect().then(()=>{
  _isConnected = true;
  database = dbclient.db("guildMembers");
  sendLog(LogType.Info,"Database Connection Established");
})
