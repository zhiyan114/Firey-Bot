import { DiscordClient } from "./core/DiscordClient";
import { logger, close, startNewTrace } from "@sentry/node-core";
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

/**
 * Setup our beloved client stuff and start it
 */
const svcClient = new ServiceClient();
const CoreClient = new DiscordClient(svcClient);
const TwitchCli = new TwitchClient(svcClient, CoreClient);
const YoutubeCli = new YoutubeClient(svcClient, CoreClient);

startNewTrace(async () => {
  // PRE PROCESSING EVENTS
  svcClient.preProcess();

  await svcClient.start();
  await CoreClient.start(process.env["BOTTOKEN"]!);
  logger.info("Bot started");
  await TwitchCli.start();
  CoreClient.setTwitchClient(TwitchCli);
  await YoutubeCli.start();

  // POST PROCESSING EVENTS HERE
  svcClient.postProcess();
});

/**
 * Handle cleanups
 */
process.on("SIGINT", async ()=> {
  // Log initial shutdown message
  // eslint-disable-next-line no-console
  console.log("Shutdown initiated...");

  // Perform cleanup
  await close(15000); // Dont catch dispose errors
  await CoreClient.dispose();
  await TwitchCli.dispose();
  await YoutubeCli.dispose();

  // Complete the shutdown
  // eslint-disable-next-line no-console
  console.log("Shutdown Complete!");
  process.exit(0);
});