// Internal Library to detect twitch stream status
import { captureException } from '@sentry/node';
import axios from 'axios';
import events from 'events';
import { twitch } from '../config';
import { LogType, sendLog } from './eventLogger';

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

let alreadyStreaming = false;
export const isStreaming = () => alreadyStreaming;

let errLogged = false;
// Twitch is making things harder than it needs to smh
const mainCheck = async () => {
    try {
        const serverResponse = await axios.get<twitchGetStreamType>(`https://api.twitch.tv/helix/streams?user_login=${twitch.channel}`,{
            headers: {
                "client-id": "q6batx0epp608isickayubi39itsckt", // Just using someone else's client ID
                "Authorization": `Bearer ${process.env['TWITCH_TOKEN']}`
            }
        });
        if(serverResponse.status != 200) {
            errLogged = true;
            sendLog(LogType.Warning, `Twitch API is responding with ${serverResponse.status} with message \`${JSON.stringify(serverResponse.data)}\``);
            return;
        }
        if(serverResponse.data.data.length > 0 && !alreadyStreaming) {
            alreadyStreaming = true;
            streamStatus.emit('start', serverResponse.data.data[0]);
        }
        else if(serverResponse.data.data.length == 0 && alreadyStreaming) {
            alreadyStreaming = false;
            streamStatus.emit('end');
        }
        if(errLogged) sendLog(LogType.Info, `Twitch API call can now be completed!`);
        errLogged = false;
    } catch(ex: unknown) {
        if(!errLogged) {
            captureException(ex);
            if(ex instanceof axios.AxiosError) await sendLog(LogType.Warning,`twitchStream: ${ex.response?.status}: ${JSON.stringify(ex.response?.data)}`);
            errLogged = true;
        }
    } finally {
        // Check it again every 30 seconds regardless if the api fails or not
        setTimeout(mainCheck,30000);
    }
}
mainCheck();

