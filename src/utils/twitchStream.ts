// Internal Library to detect twitch stream status
import axios from 'axios';
import events from 'events';
import { twitch } from '../config';
import { LogType, sendLog } from './eventLogger';

export const streamStatus = new events({});

// Type Reference: https://dev.twitch.tv/docs/api/reference#get-streams
interface stringObjectType {
    [key: string]: string
}
type getStreamData = {
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
let lastCallSuccess = false;
// Twitch is making things harder than it needs to smh
const mainCheck = () => {
    if(!lastCallSuccess && !errLogged) sendLog(LogType.Warning, "Twitch API may be down, you'll be notified again once the API call is successful")
    lastCallSuccess = false;
    axios.get<twitchGetStreamType>(`https://api.twitch.tv/helix/streams?user_login=${twitch.channels[0]}`,{
        headers: {
            "client-id": "q6batx0epp608isickayubi39itsckt", // Just using someone else's client ID
            "Authorization": `Bearer ${process.env['TWITCH_TOKEN']}`
        }
    }).then(res=>{
        if(res.status != 200) {
            errLogged = true;
            lastCallSuccess = false;
            sendLog(LogType.Warning, `Twitch API is responding with ${res.status} with message \`${JSON.stringify(res.data)}\``);
            return;
        }
        if(res.data.data.length > 0 && !alreadyStreaming) {
            alreadyStreaming = true;
            streamStatus.emit('start', res.data);
        }
        else if(res.data.data.length == 0 && alreadyStreaming) {
            alreadyStreaming = false;
            streamStatus.emit('end');
        }
        if(!lastCallSuccess) sendLog(LogType.Info, `Twitch API call can now be completed!`);
        lastCallSuccess = true;
        errLogged = false;
    })
    // Check it again every 30 seconds regardless if the api fails or not
    setTimeout(mainCheck,30000);
}
mainCheck();

