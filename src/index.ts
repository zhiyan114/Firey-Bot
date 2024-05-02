import { DiscordClient } from "./core/DiscordClient";
import { TwitchClient } from "./core/TwitchClient";


/**
 * Setup our beloved client stuff
 */

if(!process.env["BOTTOKEN"])
  throw new Error("No token provided");
if(!process.env["TWITCH_TOKEN"])
  throw new Error("No twitch token provided");

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


async function quitSignalHandler() {
  await CoreClient.dispose();
  await twitchClient.dispose();
  process.exit(0);
}

process.on("SIGINT", quitSignalHandler);
process.on("SIGTERM", quitSignalHandler);
process.on("SIGQUIT", quitSignalHandler);
  