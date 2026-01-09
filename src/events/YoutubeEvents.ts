import type { NotifiedEvent, SubEvent, YoutubeClient } from "../core/YoutubeClient";
import { baseEvent } from "../core/baseEvent";
import { youtube } from "../config.json";
import { sendLog } from "../utils/eventLogger";
import { logger } from "@sentry/node-core";


export class YoutubeEvents extends baseEvent {
  client: YoutubeClient;
  timeoutEvent: NodeJS.Timeout | undefined;
  config;
  constructor(client: YoutubeClient) {
    super();
    this.client = client;
    this.config = youtube;
  }

  public registerEvents() {
    this.client.on("subscribe", this.subscribe.bind(this));
    this.client.on("unsubscribe", this.unsubscribe.bind(this));
    this.client.on("notified", this.notified.bind(this));
  }

  private async notified(data: NotifiedEvent) {
    if(data.published.getTime() < (new Date().getTime()) - 2592000000 || data.updated.getTime() < (new Date().getTime()) - 2592000000)
      return;
    // Prevent youtube stream from being posted
    if(data.video.title.toLowerCase().includes("[live]"))
      return;
    // Prevent duplicated video links from being posted, which somehow is an issue???
    if(await this.client.service.redis.get(`youtube:${data.video.id}`) !== null)
      return;

    await this.client.service.redis.set(`youtube:${data.video.id}`, "true", "EX", 43200);
    logger.info(logger.fmt`Published Youtube Video ID: ${data.video.id}`, {
      publishTime: data.published,
      updateTime: data.updated
    });

    const rolePing = this.config.pingRoleID !== "0" ? `<@&${this.config.pingRoleID}>` : "";
    this.client.alertChannel?.send({ content: `${rolePing} New Video is out!! Check it out here: ${data.video.link}` });
  }

  private async subscribe(data: SubEvent) {
    await sendLog({
      type: "Info",
      message: "Youtube Notification Service: PubSubHubbub has been Subscribed..."
    });

    if(this.timeoutEvent) clearTimeout(this.timeoutEvent);
    this.timeoutEvent = setTimeout(()=> {
      this.client.subscribe(this.config.youtubeChannelID);
      sendLog({
        type: "Info",
        message: "Youtube Notification Service: Renewing Subscription..."
      });
    }, (parseInt(data.lease_seconds ?? "432000") * 1000) - 60000); // Resubscribe 60 seconds before the lease expires (or fallback to 5 days)

  }

  private async unsubscribe() {
    await sendLog({
      type: "Warning",
      message: "Youtube Notification Service: Even has been unsubscribed, resubscribing..."
    });
    this.client.subscribe(this.config.youtubeChannelID);
  }
}