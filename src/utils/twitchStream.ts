// Internal Library to detect twitch stream status
import axios from 'axios';
import events from 'events';

const callback = new events({});

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
    tag_ids: string,
    is_mature: boolean,
    
}
type twitchGetStreamType = {
    data: getStreamData[],
    pagination: stringObjectType,
}

let alreadyStreaming = false;

// Twitch is making things harder than it needs to smh
const mainCheck = () => {
    axios.get<twitchGetStreamType>("https://api.twitch.tv/helix/streams?user_login=xqc",{
        headers: {
            "client-id": "q6batx0epp608isickayubi39itsckt", // Just using someone else's client ID
            "Authorization": `Bearer ${process.env['TWITCH_TOKEN']}`
        }
    }).then(res=>{
        if(res.data.data.length > 0 && !alreadyStreaming) {
            alreadyStreaming = true;
            callback.emit('start');
        }
        if(res.data.data.length == 0 && alreadyStreaming) {
            alreadyStreaming = false;
            callback.emit('end');
        }
    })
}
mainCheck();

export default callback;

