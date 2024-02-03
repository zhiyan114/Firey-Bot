import "./CmdHandler";
import "./MessageHandler";
import "./interactionHandler/";
import "./UserHandler";
import "./TwitchHandler";
import YouTubeNotifier from "./youtubeNotification";
import ReactRole from "./ReactRoleHandler";
import { Client } from "discord.js";

export async function loadClientModule(client: Client) {
  YouTubeNotifier(client);
  await ReactRole(client);
}