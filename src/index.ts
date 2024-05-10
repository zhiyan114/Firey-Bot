import { DiscordClient } from "./core/DiscordClient";
import { existsSync, readFileSync, writeFileSync } from "fs";
import {config as dotenv} from "dotenv";


/**
 * .env persistance setup for docker
 */

dotenv();
if(process.env['ISDOCKER']) {
  const envToWrite = process.env["WRITE_ENV"];
  if(envToWrite) {
    const envs = envToWrite.replaceAll(' ', '').split(",");
    let envData = "";
    for(const env of envs)
      envData += `${env}=${process.env[env]}\n`;
    writeFileSync(".env", envData);
  } 
}

/**
 * Start up checks
 */

if(!process.env["BOTTOKEN"])
  throw new Error("No token provided");


if(!process.env["COMMITHASH"]) {
  // Try to load the commit hash via file
  if(existsSync("commitHash"))
    process.env["COMMITHASH"] = readFileSync("commitHash").toString();
  else
    console.warn("No commit hash found!");
}


/**
 * Setup our beloved client stuff
 */

const CoreClient = new DiscordClient();


/**
 * Let's start our beloved client
 */

CoreClient
  .start(process.env["BOTTOKEN"])
  .then(async ()=>console.log("Bot started"));

/**
 * Handle cleanups
 */
async function quitSignalHandler() {
  await CoreClient.dispose();
  await CoreClient.twitch.dispose();
  await CoreClient.youtube.dispose();
  process.exit(0);
}

process.on("SIGINT", quitSignalHandler);
process.on("SIGTERM", quitSignalHandler);
process.on("SIGQUIT", quitSignalHandler);
  