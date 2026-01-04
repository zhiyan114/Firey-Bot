import type { TwitchClient } from "../core/TwitchClient";
import type { getStreamData } from "../core/helper/twitchStream";
import { ChannelType, EmbedBuilder } from "discord.js";
import { baseTEvent } from "../core/baseEvent";
import { DiscordInvite } from "../utils/DiscordInvite";
import { clearTwitchCache } from "../utils/TwitchUser";
import { twitch } from "../config.json";
import { sendLog } from "../utils/eventLogger";



export class StreamEvents extends baseTEvent {
  client: TwitchClient;
  lastStream: Date;
  discordReminer: NodeJS.Timeout | undefined;
  config;
  constructor(client: TwitchClient) {
    super();
    this.client = client;
    this.lastStream = new Date();
    this.config = twitch;
  }

  public registerEvents() {
    this.client.streamClient.on("start", this.onStream.bind(this));
    this.client.streamClient.on("end", this.onStreamEnd.bind(this));
  }

  private async onStream(data: getStreamData) {
    if(!this.discordReminer)
      this.discordReminer = setInterval(this.sendDiscordLink.bind(this), this.config.notification.inviteRemindExpire);
    await clearTwitchCache(this.client.discord);
    if(this.lastStream && (new Date()).getTime() - this.lastStream.getTime() < 18000) return;

    const channel = await this.client.discord.channels.fetch(this.config.notification.channelID);
    if(!channel) return;
    if(channel.type !== ChannelType.GuildText)
      return await sendLog({
        type: "Error",
        message: "StreamClient: Notification channel is not a text channel!"
      });

    data.thumbnail_url = data.thumbnail_url.replace("{width}","1280").replace("{height}","720");
    const streamUrl = `https://twitch.tv/${data.user_name}`;
    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setAuthor({ name: `${data.user_name} do be streaming right now!`, url: streamUrl })
      .setTitle(data.title)
      .setDescription(`Currently streaming **${data.game_name}** with ${data.viewer_count} viewers`)
      .setURL(streamUrl)
      .setImage(data.thumbnail_url);

    const roleID = this.config.notification.roleToPing;
    await channel.send({ content: `${roleID === "everyone" ? "@everyone" : `<@&${roleID}>`} Derg is streaming right now, come join!`, embeds: [embed] });
  }

  private async onStreamEnd() {
    await clearTwitchCache(this.client.discord);
    this.clearReminder();
    this.lastStream = new Date();
  }

  private async sendDiscordLink() {
    await this.client.say(this.config.channel, `Hey! Don't forget to join our discord server! ${
      await new DiscordInvite(this.client.discord, "twitchChat").getTempInvite({
        reason: "Bot's Automatic Reminder Link",
        channel: this.config.notification.channelID
      })
    }`);

    if(this.client.streamClient.isStreaming) {
      this.clearReminder();
      this.discordReminer = setTimeout(this.sendDiscordLink.bind(this), this.config.notification.inviteRemindExpire);
    }
  }

  private clearReminder() {
    if(this.discordReminer) {
      clearInterval(this.discordReminer);
      this.discordReminer = undefined;
    }
  }
}