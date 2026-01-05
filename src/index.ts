import { DiscordClient } from "./core/DiscordClient";
import { flush } from "@sentry/node-core";
import { sendLog } from "./utils/eventLogger";
import { TwitchClient } from "./core/TwitchClient";
import { YoutubeClient } from "./core/YoutubeClient";
import { ServiceClient } from "./core/ServiceClient";


/**
 * Start up checks
 */
if(!process.env["BOTTOKEN"])
  throw new Error("No token provided");
if(!process.env["TWITCH_TOKEN"] || !process.env["TWITCH_USERNAME"])
  throw new Error("No twitch username/token provided");

// Shared Services
const svcClient = new ServiceClient();
svcClient.start();

/**
 * Setup our beloved client stuff and start it
 */

const CoreClient = new DiscordClient(svcClient);
CoreClient.start(process.env["BOTTOKEN"])
  .then(()=>console.log("Bot started"));

const TwitchCli = new TwitchClient(svcClient, CoreClient);
TwitchCli.start();
CoreClient.setTwitchClient(TwitchCli);

const YoutubeCli = new YoutubeClient(svcClient, CoreClient);
YoutubeCli.start();

// POST PROCESSING EVENTS HERE
svcClient.postProcess();



/**
 * Handle cleanups
 */
async function quitSignalHandler() {
  // Log initial shutdown message
  await sendLog({
    type: "Info",
    message: "Shutdown Initiated... View logs for shutdown completion."
  });
  console.log("Shutdown Initiated...");

  // Perform cleanup
  await CoreClient.dispose();
  await TwitchCli.dispose();
  await TwitchCli.dispose();
  await flush(15000);

  // Complete the shutdown
  console.log("Shutdown Complete!");
  process.exit(0);
}

process.on("SIGINT", quitSignalHandler);
process.on("SIGTERM", quitSignalHandler);
process.on("SIGQUIT", quitSignalHandler);