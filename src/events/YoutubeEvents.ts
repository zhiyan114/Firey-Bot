import { ChannelType, GuildTextBasedChannel } from "discord.js";
import { baseYEvent } from "../core/baseEvent";
import { NotifiedEvent, SubEvent, YoutubeClient } from "../core/YoutubeClient";


export class YoutubeEvents extends baseYEvent {
  client: YoutubeClient;
  NotificationChannel: GuildTextBasedChannel | null;
  timeoutEvent: NodeJS.Timeout | undefined;
  config;
  constructor(client: YoutubeClient) {
    super();
    this.client = client;
    this.NotificationChannel = null;
    this.config = client.discord.config.youtube;
  }

  public registerEvents() {
    this.client.on("subscribe", this.subscribe.bind(this));
    this.client.on("unsubscribe", this.unsubscribe.bind(this));
    this.client.on("notified", this.notified.bind(this));
  }

  private async notified(data: NotifiedEvent) {
    if(!this.NotificationChannel)
      await this.getChannel();
    if(data.published.getTime() < (new Date().getTime()) - 2592000000 || data.updated.getTime() < (new Date().getTime()) - 2592000000)
      return;
    // Prevent youtube stream from being posted
    if(data.video.title.toLowerCase().includes("[live]"))
      return;
    // Prevent duplicated video links from being posted, which somehow is an issue???
    if(await this.client.discord.redis.get(`youtube:${data.video.id}`) != null)
      return;

    await this.client.discord.redis.set(`youtube:${data.video.id}`, "true", "EX", 43200);
    console.log(`Video (${data.video.id}) was notified with Publish: ${data.published} and Updated: ${data.updated}`);
    this.NotificationChannel?.send({ content: `<@&${this.config.pingRoleID}> New Video is out!! Check it out here: ${data.video.link}` });
  }

  private async subscribe(data: SubEvent) {
    console.log("Youtube Notification Service: PubSubHubbub has been Subscribed...");
    await this.client.discord.logger.sendLog({
      type: "Info",
      message: "Youtube Notification Service: PubSubHubbub has been Subscribed..."
    });

    if(this.timeoutEvent) clearTimeout(this.timeoutEvent);
    this.timeoutEvent = setTimeout(()=> { 
      this.client.subscribe(this.config.youtubeChannelID);
      this.client.discord.logger.sendLog({
        type: "Info",
        message: "Youtube Notification Service: Renewing Subscription..."
      });
    }, (parseInt(data.lease_seconds ?? "432000") * 1000) - 60000); // Resubscribe 60 seconds before the lease expires (or fallback to 5 days)

  }

  private async unsubscribe() {
    console.log("Youtube Notification Service: Even has been unsubscribed, resubscribing...");
    await this.client.discord.logger.sendLog({
      type: "Warning",
      message: "Youtube Notification Service: Even has been unsubscribed, resubscribing..."
    });
    this.client.subscribe(this.config.youtubeChannelID);
  }

  private async getChannel() {
    if(this.NotificationChannel) return;
    const tempClient = await this.client.discord.channels.fetch(this.config.guildChannelID);
    if(tempClient?.type === ChannelType.GuildText)
      this.NotificationChannel = tempClient;
  }
}