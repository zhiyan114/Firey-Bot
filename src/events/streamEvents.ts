import { ChannelType, EmbedBuilder } from "discord.js";
import { TwitchClient } from "../core/TwitchClient";
import { baseTEvent } from "../core/baseEvent";
import { DiscordInvite } from "../utils/DiscordInvite";
import { clearTwitchCache } from "../utils/TwitchUser";
import { getStreamData } from "../utils/twitchStream";


export class StreamEvents extends baseTEvent {
  client: TwitchClient;
  lastStream: Date | undefined;
  discordReminer: NodeJS.Timeout | undefined;
  constructor(client: TwitchClient) {
    super();
    this.client = client;
  }
  
  public registerEvents() {
    this.client.streamClient.on("start", this.onStream.bind(this));
    this.client.streamClient.on("end", this.onStreamEnd.bind(this));
  }

  private async onStream(client: TwitchClient, data: getStreamData) {
    if(this.lastStream && (new Date()).getTime() - this.lastStream.getTime() < 18000) return;
    await clearTwitchCache(client.dClient);
    if(!this.discordReminer)
      this.discordReminer = setInterval(this.sendDiscordLink.bind(this), client.dClient.config.twitch.notification.inviteRemindExpire);

    const channel = await client.dClient.channels.fetch(client.dClient.config.twitch.notification.channelID);
    if(!channel) return;
    if(channel.type !== ChannelType.GuildText)
      return await client.dClient.logger.sendLog({
        type: "Error",
        message: "StreamClient: Notification channel is not a text channel!"
      });
      
    data.thumbnail_url = data.thumbnail_url.replace("{width}","1280").replace("{height}","720");
    const streamUrl = `https://twitch.tv/${data.user_name}`;
    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setAuthor({name: `${data.user_name} do be streaming right now!`, url: streamUrl})
      .setTitle(data.title)
      .setDescription(`Currently streaming **${data.game_name}** with ${data.viewer_count} viewers`)
      .setURL(streamUrl)
      .setImage(data.thumbnail_url);

    await channel.send({content: `<@${this.client.dClient.config.twitch.notification.roleToPing}> Derg is streaming right now, come join!`, embeds: [embed]});
  }

  private async onStreamEnd(client: TwitchClient) {
    await clearTwitchCache(client.dClient);
    if(this.discordReminer) {
      clearInterval(this.discordReminer);
      this.discordReminer = undefined;
    }
    this.lastStream = new Date();
  }

  private async sendDiscordLink() {
    await this.client.say(this.client.dClient.config.twitch.channel, `Hey! Don't forget to join our discord server! ${
      await new DiscordInvite(this.client.dClient, "twitchChat").getTempInvite({
        reason: "Bot's Automatic Reminder Link",
        channel: this.client.dClient.config.twitch.notification.channelID
      })
    }`);

    if(this.client.streamClient.isStreaming)
      this.discordReminer = setTimeout(this.sendDiscordLink.bind(this), this.client.dClient.config.twitch.notification.inviteRemindExpire);
  }
}