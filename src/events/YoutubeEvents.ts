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
    this.config = client.dClient.config.youtube;
  }

  public registerEvents() {
    this.client.on("subscribe", this.subscribe.bind(this));
    this.client.on("unsubscribe", this.unsubscribe.bind(this));
    this.client.on("notified", this.notified.bind(this));
  }

  private async notified(data: NotifiedEvent) {
    await this.getChannel();
    if(data.published.getTime() < (new Date().getTime()) - 2592000000 || data.updated.getTime() < (new Date().getTime()) - 2592000000)
      return;

    console.log(`Video (${data.video.id}) was notified with Publish: ${data.published} and Updated: ${data.updated}`);
    this.NotificationChannel?.send({ content: `<@&${this.config.pingRoleID}> New Video is out!! Check it out here: ${data.video.link}` });
  }

  private async subscribe(data: SubEvent) {
    await this.getChannel();

    console.log("Youtube Notification Service: PubSubHubbub has been Subscribed...");
    await this.client.dClient.logger.sendLog({
      type: "Info",
      message: "Youtube Notification Service: PubSubHubbub has been Subscribed..."
    });

    if(this.timeoutEvent) clearTimeout(this.timeoutEvent);
    this.timeoutEvent = setTimeout(()=> { 
      this.client.subscribe(this.config.youtubeChannelID);
      this.client.dClient.logger.sendLog({
        type: "Info",
        message: "Youtube Notification Service: Renewing Subscription..."
      });
    }, (parseInt(data.lease_seconds ?? "432000") * 1000) - 60000); // Resubscribe 60 seconds before the lease expires (or fallback to 5 days)

  }

  private async unsubscribe() {
    await this.getChannel();

    console.log("Youtube Notification Service: Even has been unsubscribed, resubscribing...");
    await this.client.dClient.logger.sendLog({
      type: "Warning",
      message: "Youtube Notification Service: Even has been unsubscribed, resubscribing..."
    });
    this.client.subscribe(this.config.youtubeChannelID);
  }

  private async getChannel() {
    if(this.NotificationChannel) return;
    const tempClient = await this.client.dClient.channels.fetch(this.config.guildChannelID);
    if(tempClient?.type === ChannelType.GuildText)
      this.NotificationChannel = tempClient;
  }
}