/*
 * Name: twitchStream.ts
 * Desc: Internal Library to detect twitch stream status
 * Author: zhiyan114
 */

import type { TwitchClient } from "../TwitchClient";
import { captureException } from "@sentry/node";
import events from "events";
import { fetch, Agent, errors } from "undici";

// Type Reference: https://dev.twitch.tv/docs/api/reference#get-streams
interface stringObjectType {
    [key: string]: string
}
export type getStreamData = {
    id: string,
    user_id: string,
    user_login: string,
    user_name: string,
    game_id: string,
    game_name: string,
    type: string,
    title: string,
    viewer_count: number,
    started_at: string,
    language: string,
    thumbnail_url: string,
    tag_ids: string[],
    is_mature: boolean,
}
export type twitchGetStreamType = {
    data: getStreamData[],
    pagination: stringObjectType,
}

// Util Class Definition
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export declare interface streamClient extends events.EventEmitter {
    on(event: "start", listener: (data: getStreamData) => void): this;
    on(event: "end", listener: (client: TwitchClient) => void): this;
    emit(eventName: "start", data: getStreamData): boolean;
    emit(eventName: "end"): boolean;
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class streamClient extends events.EventEmitter {
  private client: TwitchClient;
  private token: string;
  private channel: string;
  private cooldown: number;
  public isStreaming = false;
  private errLogged = false;
  private webAgent: Agent;

  constructor(client: TwitchClient, channelName: string, cooldown?: number, token?: string) {
    super();
    this.client = client;
    this.token = token ?? process.env["TWITCH_TOKEN"] ?? "";
    if(this.token === "")
      throw new tClientError("TwitchClient's oauth token is not properly supplied");
    this.channel = channelName;
    this.cooldown = cooldown ?? 30000; // Check every 30 seconds by default

    // Create a dedicated fetch Agent instance for this request to fix ETIMEDOUT (probably due to SNAT issue)
    this.webAgent = new Agent({
      connect: {
        keepAlive: true,
        timeout: Math.ceil(this.cooldown / 2),
      }
    });

    this.mainCheck();
  }

  private mainCheck = async () => {
    try {
      const serverRes = await fetch(`https://api.twitch.tv/helix/streams?user_login=${this.channel}`, {
        method: "GET",
        headers: {
          "Client-ID": "q6batx0epp608isickayubi39itsckt", // Just using someone else's client ID
          "Authorization": `Bearer ${this.token}`,
        },
        dispatcher: this.webAgent,
      });

      const contentType = serverRes.headers.get("content-type");
      if(!contentType || contentType.includes("application/json") === false) {
        return await this.client.discord.logger.sendLog({
          type: "Warning",
          message: `Twitch API has responded with invalid content type header: \`${contentType}\``
        });
      }


      const bodyData = await serverRes.json() as twitchGetStreamType;
      if(!serverRes.ok)
        return await this.client.discord.logger.sendLog({
          type: "Warning",
          message: `twitchStream: Status code did not respond with OK body: \`\`\`${bodyData}\`\`\``,
          metadata: {
            status: serverRes.status.toString(),
          }
        });

      if(bodyData.data.length > 0 && !this.isStreaming) {
        this.isStreaming = true;
        this.emit("start",  bodyData.data[0]);
      } else if(bodyData.data.length === 0 && this.isStreaming) {
        this.isStreaming = false;
        this.emit("end");
      }

      if(this.errLogged)
        await this.client.discord.logger.sendLog({
          type: "Info",
          message: "Twitch API call can now be completed!"
        });
      this.errLogged = false;

    } catch(ex: unknown) {
      if(!this.errLogged) {
        this.errLogged = true;
        if(ex instanceof errors.ConnectTimeoutError && ex.code === "UND_ERR_CONNECT_TIMEOUT")
          return await this.client.discord.logger.sendLog({
            type: "Warning",
            message: `twitchStream: Connection Timeout - ${ex.message}`
          });

        const sentryID = captureException(ex);
        await this.client.discord.logger.sendLog({
          type: "Warning",
          message: `twitchStream: Unhandled Exception, check sentry for more details: ${sentryID}`
        });
      }
    } finally {
      // Check it again every 30 seconds regardless if the api fails or not
      setTimeout(this.mainCheck,this.cooldown);
    }
  };
}

export class tClientError extends Error {
  constructor(message: string) {
    super();
    this.name = "twitchClientError";
    this.message = message;
  }
}

