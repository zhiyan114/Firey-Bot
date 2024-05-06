/*
 * Name: twitchStream.ts
 * Desc: Internal Library to detect twitch stream status
 * Author: zhiyan114
 */
import { captureException } from "@sentry/node";
import axios, { Axios } from "axios";
import events from "events";
import https from "https"; 
import { TwitchClient } from "../TwitchClient";

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
  private axios: Axios;

  constructor(client: TwitchClient, channelName: string, cooldown?: number, token?: string) {
    super();
    this.client = client;
    this.token = token ?? process.env["TWITCH_TOKEN"] ?? "";
    if(this.token === "") throw new tClientError("TwitchClient's oauth token is not properly supplied", "twitchStream - BadToken");
    this.channel = channelName;
    this.cooldown = cooldown ?? 30000; // Check every 30 seconds by default
    // Create a dedicated axios instance for this request to fix ETIMEDOUT (probably due to SNAT issue)
    this.axios = axios.create({
      timeout: Math.ceil(this.cooldown/2),
      httpsAgent: new https.Agent({keepAlive: true})
    });

    this.mainCheck();
  }

  private mainCheck = async () => {
    try {
      const serverResponse = await this.axios.get<twitchGetStreamType>(`https://api.twitch.tv/helix/streams?user_login=${this.channel}`,{
        headers: {
          "client-id": "q6batx0epp608isickayubi39itsckt", // Just using someone else's client ID
          "Authorization": `Bearer ${this.token}`,
        }
      });

      if(serverResponse.status !== 200) {
        this.errLogged = true;
        return await this.client.dClient.logger.sendLog({
          type: "Warning",
          message: `Twitch API is responding with ${serverResponse.status} with message \`${JSON.stringify(serverResponse.data)}\``
        });
      }

      if(serverResponse.data.data.length > 0 && !this.isStreaming) {
        this.isStreaming = true;
        this.emit("start",  serverResponse.data.data[0]);
      }

      else if(serverResponse.data.data.length === 0 && this.isStreaming) {
        this.isStreaming = false;
        this.emit("end");
      }

      if(this.errLogged)
        await this.client.dClient.logger.sendLog({
          type: "Info",
          message: "Twitch API call can now be completed!"
        });
      this.errLogged = false;

    } catch(ex: unknown) {
      if(!this.errLogged) {
        this.errLogged = true;
        if(ex instanceof axios.AxiosError && (ex.code === axios.AxiosError.ECONNABORTED || ex.code === axios.AxiosError.ETIMEDOUT))
          return await this.client.dClient.logger.sendLog({
            type: "Warning",
            message: `twitchStream: Connection Timeout - ${ex.message}`
          });
          
        if(ex instanceof axios.AxiosError)
          if(ex.response && Math.floor(ex.response.status/100) === 5)
            return await this.client.dClient.logger.sendLog({
              type: "Warning",
              message: `twitchStream: Twitch's Backend Server Error (status: ${ex.response.status})`
            });
        
        await this.client.dClient.logger.sendLog({
          type: "Warning",
          message: "twitchStream: Service is down due to unhandled exception"
        });
        captureException(ex);
      }
    } finally {
      // Check it again every 30 seconds regardless if the api fails or not
      setTimeout(this.mainCheck,this.cooldown);
    }
  };
}

export class tClientError extends Error {
  constructor(message: string, name?: string) {
    super();
    this.name = name ?? "twitchClientError";
    this.message = message;
  }
}

