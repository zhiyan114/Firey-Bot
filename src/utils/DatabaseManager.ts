import Mongoose from "mongoose";
import { LogType, sendLog } from "./eventLogger";

export const isConnected = () => Mongoose.connection.readyState == Mongoose.ConnectionStates.connected;

Mongoose.connect(process.env['MONGODB_CONN'] as string).then(_=>{
  console.log("Database Connected...");
  sendLog(LogType.Info,"Database Connection Established");
})