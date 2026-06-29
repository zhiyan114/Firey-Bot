import type { baseClient } from "./baseClient";
import { ActivityType, Client, GatewayIntentBits, Partials, DefaultWebSocketManagerOptions, TextChannel, Options } from "discord.js";
import { getClient } from "@sentry/node";
import { DiscordEvents } from "../events";
import { DiscordCommandHandler } from "../events/helper/DiscordCommandHandler";
import { unverifyKickLoader, ReactRoleLoader, VoiceChatReward } from "../services";
import { guildID, reactRoles } from '../config.json';
import { DiscordInvite } from "./helper/DiscordInvite";
import type { TwitchClient } from "./TwitchClient";
import { patchClient } from "../utils/MPClient";



/**
 * Integrated Discord Client
 * @class DiscordClient
 * @method start - Start the client
 * @method dispose - Stop the client and dispose the resources
 * @method updateStatus - Update the status of the bot
 */
export class DiscordClient extends Client implements baseClient {
  readonly sysVer: string; // Software Release Version
  readonly inviteManager;
  private _tClient?: TwitchClient;

  constructor() {
    super({
      rest: {
      // This fixes issue where sending attachment file causes request timeout
      // Related to https://github.com/discordjs/discord.js/issues/11525
      // Actually, gonna just use undici 7.27.2 as workaround instead lol
      makeRequest: globalThis.fetch.bind(globalThis) as never,
      },
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.User,
      ],
      makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        MessageManager: {
          maxSize: 10,
          keepOverLimit: (msg) => msg.channelId === reactRoles.channelID && msg.author.id === msg.client.user.id
        }, // We dont care about user message after the initial processing
      })
    });

    // Setup
    this.sysVer = getClient()?.getOptions().release ?? "??????";
    this.inviteManager = new DiscordInvite(this);
    patchClient(this, "discord");

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
        name: `${this.guilds.cache.get(guildID)?.memberCount} cuties :Þ | ver ${this.sysVer}`,
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