import { DiscordClient } from "./core/DiscordClient";
import { TwitchClient } from "./core/TwitchClient";
import { existsSync, readFileSync, writeFileSync } from "fs";
import {config as dotenv} from "dotenv";


/**
 * .env persistance setup for docker
 */
if(process.env['IS_DOCKER']) {
  const envToWrite = process.env["WRITE_ENV"];
  if(envToWrite) {
    const envs = envToWrite.split(",");
    let envData = "";
    for(const env of envs)
      envData += `${env}=${process.env[env]}\n`;
    writeFileSync(".env", envData);
  } else dotenv();
}


/**
 * Start up checks
 */

if(!process.env["BOTTOKEN"])
  throw new Error("No token provided");
if(!process.env["TWITCH_TOKEN"])
  throw new Error("No twitch token provided");

if(!process.env["commitHash"]) {
  // Try to load the commit hash via file
  if(existsSync("commitHash"))
    process.env["commitHash"] = readFileSync("commitHash").toString();
  else
    console.warn("No commit hash found!");
}


/**
 * Setup our beloved client stuff
 */

const CoreClient = new DiscordClient();
const twitchClient = new TwitchClient(CoreClient, process.env["TWITCH_TOKEN"]);


/**
 * Let's start our beloved client
 */

CoreClient
  .start(process.env["BOTTOKEN"])
  .then(()=>console.log("Bot started"));

twitchClient
  .start()
  .then(()=>console.log("Twitch client started"));


/**
 * Handle cleanups
 */
async function quitSignalHandler() {
  await CoreClient.dispose();
  await twitchClient.dispose();
  process.exit(0);
}

process.on("SIGINT", quitSignalHandler);
process.on("SIGTERM", quitSignalHandler);
process.on("SIGQUIT", quitSignalHandler);
  