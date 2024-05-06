import { DiscordClient } from "./core/DiscordClient";
import { TwitchClient } from "./core/TwitchClient";
import { existsSync, readFileSync, writeFileSync } from "fs";
import {config as dotenv} from "dotenv";
import { YoutubeClient } from "./core/YoutubeClient";


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
if(!process.env["TWITCH_TOKEN"] || !process.env["TWITCH_USERNAME"])
  throw new Error("No twitch username/token provided");

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

const port = process.env["WEBSERVER_PORT"];

const CoreClient = new DiscordClient();
const twitchClient = new TwitchClient(CoreClient, process.env["TWITCH_USERNAME"], process.env["TWITCH_TOKEN"]);
const youtubeClient = new YoutubeClient({
  client: CoreClient,
  FQDN: process.env["WEBSERVER_FQDN"] || "",
  Port: !port || Number.isNaN(parseInt(port)) ? undefined : parseInt(port),
  Path: "/UwU/youtube/callback/",
  secret: process.env["YTSECRET"]
});


/**
 * Let's start our beloved client
 */

CoreClient
  .start(process.env["BOTTOKEN"])
  .then(async ()=>{
    console.log("Bot started");

    // Run the core client then the utility clients..
    await twitchClient.start();
    console.log("Twitch client started");

    await youtubeClient.start();
    console.log("Youtube client started");
  });

/**
 * Handle cleanups
 */
async function quitSignalHandler() {
  await CoreClient.dispose();
  await twitchClient.dispose();
  await youtubeClient.dispose();
  process.exit(0);
}

process.on("SIGINT", quitSignalHandler);
process.on("SIGTERM", quitSignalHandler);
process.on("SIGQUIT", quitSignalHandler);
  