import type { baseClient } from "./baseClient";
import { ActivityType, Client, GatewayIntentBits, Partials, DefaultWebSocketManagerOptions, TextChannel } from "discord.js";
import { getClient } from "@sentry/node-core";
import { DiscordEvents } from "../events";
import { DiscordCommandHandler } from "../events/helper/DiscordCommandHandler";
import { unverifyKickLoader, ReactRoleLoader, VoiceChatReward } from "../services";
import { guildID } from '../config.json';
import type { ServiceClient } from "./ServiceClient";
import { DiscordInvite } from "./helper/DiscordInvite";
import type { TwitchClient } from "./TwitchClient";



/**
 * Integrated Discord Client
 * @class DiscordClient
 * @method start - Start the client
 * @method dispose - Stop the client and dispose the resources
 * @method updateStatus - Update the status of the bot
 */
export class DiscordClient extends Client implements baseClient {
  readonly sysVer: string; // Software Release Version
  readonly service;
  readonly inviteManager;
  private _tClient?: TwitchClient;

  constructor(service: ServiceClient) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.User,
      ]
    });

    // Setup
    this.sysVer = getClient()?.getOptions().release ?? "??????";
    this.service = service;
    this.inviteManager = new DiscordInvite(this);

    // @ts-expect-error Override readonly property
    DefaultWebSocketManagerOptions.identifyProperties.browser = "Discord iOS";

    new DiscordEvents(this)
      .registerEvents();

  }

  public async start(token: string) {
    await this.login(token);
    // Start all services
    await new DiscordCommandHandler(this).commandRegister();
    await this.loadServices();
    this.updateStatus();
  }

  public async dispose() {
    // Close all connections
    await this.destroy();
  }

  public updateStatus() {
    this.user?.setPresence({
      status: "online",
      activities: [{
        name: `${this.guilds.cache.find(g=>g.id===guildID)?.memberCount} cuties :Þ | ver ${this.sysVer}`,
        type: ActivityType.Watching,
      }],
    });
  }

  public async getTChannel(id: string) {
    const Alertch = await this.channels.fetch(id);
    if(!Alertch)
      throw Error("No valid discord channel found with the given ID for youtube alert");
    if(!(Alertch instanceof TextChannel))
      throw Error("The given discord channel is not a text channel");
    return Alertch;
  }

  public setTwitchClient(tClient: TwitchClient) {
    if(!this.tClient)
      this._tClient = tClient;
  }

  get tClient() {
    return this._tClient;
  }

  private async loadServices() {
    await ReactRoleLoader(this);
    await (new unverifyKickLoader(this)).load();
    await (new VoiceChatReward(this)).init();
  }

}