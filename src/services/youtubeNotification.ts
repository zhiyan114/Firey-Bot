const YouTubeNotifier = require('youtube-notification');
import { Client, TextChannel } from 'discord.js';
//import { restServer } from '../utils/WebServer';
import { sendLog, LogType } from '../utils/eventLogger';
import 'middie';
import config from '../../config.json';

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

const conf = config.youtubeNotification;

export default (client : Client) => {
    const NotificationChannel = client.channels.cache.find(channel => channel.id === conf.guildChannelID) as TextChannel;
    let timeoutEvent : NodeJS.Timeout;
    const notifier = new YouTubeNotifier({
        hubCallback: 'http://service.zhiyan114.com:46271/youtube/callback',
        //hubCallback: 'http://service.zhiyan114.com/youtube/callback',
        //middleware: true,
        port: 46271,
        secret: 'NotifierSecret_aos9z8vh2na68z8df7aa982jahfg6738',
        path: '/youtube/callback'
    })
    notifier.setup();
    //restServer.use("/youtube/callback", notifier.listener());

    // @ts-ignore (Legacy Library)
    notifier.on('notified', data =>{
        NotificationChannel.send({ content: `<@&${conf.pingRoleID}> New Video is out!! Check it out here: ${data.video.link}` });
    })
    // @ts-ignore
    notifier.on('subscribe', data =>{
        console.log("Youtube Notification Service: PubSubHubbub has been Subscribed...");
        sendLog(LogType.Info, "Youtube Notification Service: PubSubHubbub has been Subscribed...");
        // Cancel the timeout event if it already set
        if(timeoutEvent) clearTimeout(timeoutEvent);
        timeoutEvent = setTimeout(()=> { 
          notifier.subscribe(conf.youtubeChannelID);
          sendLog(LogType.Info, "Youtube Notification Service: PubSubHubbub has been successfully renewed");
        }, (data.lease_seconds * 1000) - 60000); // Resubscribe 60 seconds before the lease expires
        
        
    })
    // @ts-ignore
    notifier.on('unsubscribe', data => {
        console.log("Youtube Notification Service: Even has been unsubscribed, resubscribing...");
        sendLog(LogType.Warning, "Youtube Notification Service: Even has been unsubscribed, resubscribing...");
        notifier.subscribe(conf.youtubeChannelID)
    })
    notifier.subscribe(conf.youtubeChannelID);
}