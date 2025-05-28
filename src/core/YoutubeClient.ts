import YouTubeNotifier from "../utils/youtube-notifier";
import { DiscordClient } from "./DiscordClient";
import Express from 'express';
import { baseClient } from "./baseClient";
import http from 'http';
import https from 'https';
import { YoutubeEvents } from "../events";
import { setupExpressErrorHandler } from "@sentry/node";

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

interface config {
    client: DiscordClient;
    FQDN: string;
    Path: string;
    https?: boolean;
    PubSubPort?: number;
    Port?: number;
    secret?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export declare interface YoutubeClient extends YouTubeNotifier {
    on(event: "notified", listener: (data: NotifiedEvent) => void): this;
    on(event: "subscribe" | "unsubscribe", listener: (data: SubEvent) => void): this;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class YoutubeClient extends YouTubeNotifier implements baseClient {
  readonly express: Express.Express;
  readonly httpServer: https.Server | http.Server;
  readonly discord: DiscordClient;
  readonly port: number;

  constructor(config: config) {
    const PubSubPort = config.PubSubPort ?? config.Port;
    const pubsuburl = `${config.https ? "https" : "http"}://${config.FQDN}${PubSubPort ? `:${PubSubPort}` : ""}${config.Path}`;
    super({
      hubCallback: pubsuburl,
      middleware: true,
      secret: config.secret ?? "NotifierSecret_ShouldNotBeExposed",
    });
    console.log(`Current PubSub URL: ${pubsuburl}`);

    this.express = Express();
    this.discord = config.client;
    this.port = config.Port ?? 80;
    this.express.use(config.Path, this.listener());
    this.httpServer = config.https ? https.createServer(this.express) : http.createServer(this.express);
    
    // Add express integration to Sentry
    setupExpressErrorHandler(this.express);

    // Register events
    new YoutubeEvents(this)
      .registerEvents();
  }

  public async start() {
    this.express.get("/test/", this.HealthRoute);
    await new Promise<void>((resolve) => this.httpServer.listen(this.port, ()=>resolve()));
    await this.discord.logger.sendLog({
      type: "Info",
      message: "Web server started!"
    });
    this.subscribe(this.discord.config.youtube.youtubeChannelID);
  }

  private HealthRoute(req: Express.Request, res: Express.Response) {
    res.status(200).send("You have been OwO");
  }

  public async dispose() {
    await new Promise<void>((resolve, reject) => this.httpServer.close((res)=> res ? reject(res) : resolve()));
  }
}