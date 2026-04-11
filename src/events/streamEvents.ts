import type { TwitchClient } from "../core/TwitchClient";
import type { getStreamData } from "../core/helper/twitchStream";
import { ChannelType, EmbedBuilder } from "discord.js";
import { baseEvent } from "../core/baseEvent";
import { clearTwitchCache } from "../utils/TwitchUser";
import { twitch } from "../config.json";
import { sendLog } from "../utils/eventLogger";
import { discordCli, svcClient } from "../SharedClient";



export class StreamEvents extends baseEvent {
  client: TwitchClient;
  lastStream: Date;
  discordReminer: NodeJS.Timeout | undefined;
  constructor(client: TwitchClient) {
    super();
    this.client = client;
    this.lastStream = new Date();
  }

  public registerEvents() {
    this.client.streamClient.on("start", this.onStream.bind(this));
    this.client.streamClient.on("end", this.onStreamEnd.bind(this));
  }

  private async onStream(data: getStreamData) {
    if(!this.discordReminer)
      this.discordReminer = setInterval(this.sendDiscordLink.bind(this), twitch.notification.inviteRemindExpire);
    await clearTwitchCache(svcClient.redis);
    if(this.lastStream && (new Date()).getTime() - this.lastStream.getTime() < 18000) return;

    const channel = await discordCli.channels.fetch(twitch.notification.channelID);
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

    const roleID = twitch.notification.roleToPing;
    await channel.send({ content: `${roleID === "everyone" ? "@everyone" : `<@&${roleID}>`} Derg is streaming right now, come join!`, embeds: [embed] });
  }

  private async onStreamEnd() {
    await clearTwitchCache(svcClient.redis);
    this.clearReminder();
    this.lastStream = new Date();
  }

  private async sendDiscordLink() {
    await this.client.say(twitch.channel, `Hey! Don't forget to join our discord server! ${
      await discordCli.inviteManager.getTempInvite({
        requestID: "twitchChat",
        reason: "Bot's Automatic Reminder Link",
        channel: twitch.notification.channelID
      })
    }`);

    if(this.client.streamClient.isStreaming) {
      this.clearReminder();
      this.discordReminer = setTimeout(this.sendDiscordLink.bind(this), twitch.notification.inviteRemindExpire);
    }
  }

  private clearReminder() {
    if(this.discordReminer) {
      clearInterval(this.discordReminer);
      this.discordReminer = undefined;
    }
  }
}