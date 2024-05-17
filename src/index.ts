import { DiscordClient } from "./core/DiscordClient";
import { writeFileSync } from "fs";
import { flush } from "@sentry/node";


/**
 * .env persistance setup for docker
 */

function saveEnv() {
  const envToWrite = process.env["WRITE_ENV"];
  if(envToWrite) {
    const envs = envToWrite.replaceAll(' ', '').split(",");
    let envData = "";
    for(const env of envs)
      envData += `${env}=${process.env[env]}\n`;
    writeFileSync(".env", envData);
  }
}

if(process.env['ISDOCKER'])
  saveEnv();

/**
 * Start up checks
 */

if(!process.env["BOTTOKEN"])
  throw new Error("No token provided");

/**
 * Setup our beloved client stuff and start it
 */
const CoreClient = new DiscordClient();
CoreClient
  .start(process.env["BOTTOKEN"])
  .then(()=>console.log("Bot started"));

/**
 * Handle cleanups
 */
async function quitSignalHandler() {
  // Log initial shutdown message
  await CoreClient.logger.sendLog({
    type: "Info",
    message: "Shutdown Initiated... View logs for shutdown completion."
  });
  console.log("Shutdown Initiated...");

  // Perform cleanup
  await CoreClient.dispose();
  await CoreClient.twitch.dispose();
  await CoreClient.youtube.dispose();
  await flush(15000);

  // Complete the shutdown
  console.log("Shutdown Complete!");
  process.exit(0);
}

process.on("SIGINT", quitSignalHandler);
process.on("SIGTERM", quitSignalHandler);
process.on("SIGQUIT", quitSignalHandler);