import { DiscordClient } from "./core/DiscordClient";


/**
 * Setup our beloved client stuff
 */

if(!process.env["BOTTOKEN"])
  throw new Error("No token provided");

const CoreClient = new DiscordClient();

/**
 * Let's start our beloved client
 */

CoreClient
  .start(process.env["BOTTOKEN"])
  .then(()=>console.log("Bot started"));

async function quitSignalHandler() {
  await CoreClient.dispose();
  process.exit(0);
}

process.on("SIGINT", quitSignalHandler);
process.on("SIGTERM", quitSignalHandler);
process.on("SIGQUIT", quitSignalHandler);
  