import YouTubeNotifier from "../utils/youtube-notifier";
import { Client, TextChannel } from "discord.js";
import { restServer, isHttpsMode } from "../utils/WebServer";
import { sendLog, LogType } from "../utils/eventLogger";
import {youtubeNotification as conf, webServer as webConf} from "../config";

/*
import WebhookServer from '../utils/WebhookServer';
WebhookServer.use("/youtube/callback", notifier.listen());

Example Reference
{
  video: {
    id: 'oah97oNMz28',
    title: 'aaaaaaaaaaa',
    link: 'https://www.youtube.com/watch?v=oah97oNMz28'
  },
  channel: {
    id: 'UCNZslkqeU_592TWvxs4zxtg',
    name: 'The overseer',
    link: 'https://www.youtube.com/channel/UCNZslkqeU_592TWvxs4zxtg'
  },
  published: 2022-04-28T20:34:48.000Z,
  updated: 2022-04-28T20:35:09.471Z
}

{
  type: 'subscribe',
  channel: 'UCNZslkqeU_592TWvxs4zxtg',
  lease_seconds: '432000'
}
*/

// Type Interfaces for notified and subscribed event.

interface VideoData {
  id: string;
  title: string;
  link: string;
}
interface ChannelData {
  id: string;
  name: string;
  link: string;
}
interface SubEvent {
  type: string;
  channel: string;
  lease_seconds?: string;
}
interface NotifiedEvent {
  video: VideoData;
  channel: ChannelData;
  published: Date;
  updated: Date;
}

export default (client : Client) => {
  const NotificationChannel = client.channels.cache.find(channel => channel.id === conf.guildChannelID) as TextChannel;
  let timeoutEvent : NodeJS.Timeout;
  const notifier = new YouTubeNotifier({
    hubCallback: `${isHttpsMode ? "https" : "http"}://${webConf.FQDN}${webConf.Port ? `:${webConf.Port}` : ""}/youtube/callback`,
    middleware: true,
    secret: "NotifierSecret_aos9z8vh2na68z8df7aa982jahfg6738",
  });
  restServer.use("/youtube/callback", notifier.listener());


  notifier.on("notified", (data : NotifiedEvent) =>{
    NotificationChannel.send({ content: `<@&${conf.pingRoleID}> New Video is out!! Check it out here: ${data.video.link}` });
  });

  notifier.on("subscribe", (data : SubEvent) =>{
    console.log("Youtube Notification Service: PubSubHubbub has been Subscribed...");
    sendLog(LogType.Info, "Youtube Notification Service: PubSubHubbub has been Subscribed...");
    // Cancel the timeout event if it already set
    if(timeoutEvent) clearTimeout(timeoutEvent);
    timeoutEvent = setTimeout(()=> { 
      notifier.subscribe(conf.youtubeChannelID);
      sendLog(LogType.Info, "Youtube Notification Service: Renewing Subscription...");
    }, (parseInt(data.lease_seconds ?? "432000") * 1000) - 60000); // Resubscribe 60 seconds before the lease expires (or fallback to 5 days)
  });

  notifier.on("unsubscribe", () => {
    console.log("Youtube Notification Service: Even has been unsubscribed, resubscribing...");
    sendLog(LogType.Warning, "Youtube Notification Service: Even has been unsubscribed, resubscribing...");
    notifier.subscribe(conf.youtubeChannelID);
  });

  notifier.subscribe(conf.youtubeChannelID);
};