import { DiscordClient } from "./core/DiscordClient";
import { ServiceClient } from "./core/ServiceClient";
import { TwitchClient } from "./core/TwitchClient";
import { YoutubeClient } from "./core/YoutubeClient";

export const svcClient = new ServiceClient();
export const discordCli = new DiscordClient();
export const TwitchCli = new TwitchClient();
export const YoutubeCli = new YoutubeClient(svcClient);