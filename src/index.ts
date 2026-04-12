import { logger, close, startNewTrace } from "@sentry/node";
import { discordCli, svcClient, TwitchCli, YoutubeCli } from "./SharedClient";

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

startNewTrace(async () => {
  // PRE PROCESSING EVENTS
  svcClient.preProcess();

  await svcClient.start();
  await discordCli.start(process.env["BOTTOKEN"]!);
  logger.info("Bot started");
  await TwitchCli.start();
  discordCli.setTwitchClient(TwitchCli);
  await YoutubeCli.start(discordCli);

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
  await discordCli.dispose();
  await TwitchCli.dispose();
  await YoutubeCli.dispose();

  // Complete the shutdown
  // eslint-disable-next-line no-console
  console.log("Shutdown Complete!");
  process.exit(0);
});