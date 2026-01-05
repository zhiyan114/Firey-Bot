import type { baseClient } from "./baseClient";
import YouTubeNotifier from "../utils/youtube-notifier";
import { YoutubeEvents } from "../events";
import { youtube } from "../config.json";
import type { DiscordClient } from "./DiscordClient";
import type { ServiceClient } from "./ServiceClient";

/*
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
export interface SubEvent {
  type: string;
  channel: string;
  lease_seconds?: string;
}
export interface NotifiedEvent {
  video: VideoData;
  channel: ChannelData;
  published: Date;
  updated: Date;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export declare interface YoutubeClient extends YouTubeNotifier {
    on(event: "notified", listener: (data: NotifiedEvent) => void): this;
    on(event: "subscribe" | "unsubscribe", listener: (data: SubEvent) => void): this;
}


// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class YoutubeClient extends YouTubeNotifier implements baseClient {
  readonly service;
  readonly _alertChannel;
  constructor(service: ServiceClient, dClient: DiscordClient) {
    const PubSubPort = youtube.overridePort !== 0 ? youtube.overridePort : process.env["WEBSERVER_PORT"];
    const Protocol = (process.env["WEBSERVER_HTTPS"] === "true") ? "https" : "http";
    const FQDN = process.env["WEBSERVER_FQDN"] ?? "";
    const Path = "/UwU/youtube/callback/";
    const pubsuburl = `${Protocol}://${FQDN}${PubSubPort ? `:${PubSubPort}` : ""}${Path}`;

    super({
      hubCallback: pubsuburl,
      middleware: true,
      secret: process.env["YTSECRET"] ?? "NotifierSecret_ShouldNotBeExposed",
    });
    this.service = service;
    this._alertChannel = dClient.getChannel(youtube.guildChannelID);
    service.express.use(Path, this.listener());
    console.log(`Current PubSub URL: ${pubsuburl}`);

    // Register events
    new YoutubeEvents(this)
      .registerEvents();
  }

  public async start() {
    this.subscribe(youtube.youtubeChannelID);
  }

  public async dispose() {
    // this.unsubscribe(youtube.youtubeChannelID);
  }

  get alertChannel() {
    return this._alertChannel;
  }
}