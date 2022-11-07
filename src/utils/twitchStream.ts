// Internal Library to detect twitch stream status
import { captureException } from '@sentry/node';
import axios from 'axios';
import events from 'events';
import { LogType, sendLog } from './eventLogger';
import https from 'https'; 
import http from 'http';

export const streamStatus = new events({});

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
export declare interface twitchClient {
    on(event: 'start', listener: (data: getStreamData) => void): this;
    on(event: 'end', listener: () => void): this;
}
export class twitchClient extends events.EventEmitter {
    private token: string;
    private channel: string;
    private cooldown: number;
    public isStreaming: boolean = false;
    private errLogged = false;
    constructor(channelName: string, cooldown?: number, token?: string) {
        super();
        this.token = token ?? process.env['TWITCH_TOKEN'] ?? "";
        if(this.token == "") throw new tClientError("TwitchClient's oauth token is not properly supplied", "BadToken");
        this.channel = channelName;
        this.cooldown = cooldown ?? 30000; // Check every 30 seconds by default
        this.mainCheck();
    }
    private mainCheck = async () => {
        try {
            const serverResponse = await axios.get<twitchGetStreamType>(`https://api.twitch.tv/helix/streams?user_login=${this.channel}`,{
                headers: {
                    "client-id": "q6batx0epp608isickayubi39itsckt", // Just using someone else's client ID
                    "Authorization": `Bearer ${this.token}`,
                },
                timeout: 60000,
                httpsAgent: new https.Agent({ keepAlive: true }),
                httpAgent: new http.Agent({ keepAlive: true }),
            });
            if(serverResponse.status != 200) {
                this.errLogged = true;
                sendLog(LogType.Warning, `Twitch API is responding with ${serverResponse.status} with message \`${JSON.stringify(serverResponse.data)}\``);
                return;
            }
            if(serverResponse.data.data.length > 0 && !this.isStreaming) {
                this.isStreaming = true;
                streamStatus.emit('start',  serverResponse.data.data[0]);
            }
            else if(serverResponse.data.data.length == 0 && this.isStreaming) {
                this.isStreaming = false;
                streamStatus.emit('end');
            }
            if(this.errLogged) sendLog(LogType.Info, `Twitch API call can now be completed!`);
            this.errLogged = false;
        } catch(ex: unknown) {
            if(!this.errLogged) {
                this.errLogged = true;
                if(ex instanceof axios.AxiosError && (ex.code == axios.AxiosError.ECONNABORTED || ex.code == axios.AxiosError.ETIMEDOUT)) return await sendLog(LogType.Warning,`twitchStream: Connection Timeout - ${ex.message}`);
                await sendLog(LogType.Warning, "twitchStream: Service is down due to unhandled exception");
                captureException(ex);
            }
        } finally {
            // Check it again every 30 seconds regardless if the api fails or not
            setTimeout(this.mainCheck,this.cooldown);
        }
    }
    
}
export class tClientError extends Error {
    constructor(message: string, name?: string) {
        super();
        this.name = name ?? "twitchClientError";
        this.message = message;
    }
}

