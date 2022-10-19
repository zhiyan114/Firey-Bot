import tmi from 'tmi.js';
import { twitch } from '../config';
import { LogType, sendLog } from '../utils/eventLogger';


const tmiClient = new tmi.Client({
    connection: {
        secure: true,
        reconnect: true,
    },
    identity: {
        username: "fireybotuwu",
        password: `oauth:${process.env['TWITCH_TOKEN']}`
    },
    channels: twitch.channels,
})

tmiClient.connect().then(()=>{
    sendLog(LogType.Info, "Twitch Bot Connected!")
})

// list of twitch users that haven't link to their discord channel. This is to prevent unnecessary database call everytime when user se
const AuthUsers = {}

tmiClient.on('message', (channel, tags, message, self)=>{
    if(self) return;
    // Check prefix to determine if this is a chat message or command
    if(message.slice(0,1) == twitch.prefix) {
        const args = message.split(" ")
        // You cant get awarded for using the commands lol
        return;
    }
    // Check if the server is active before reward p
    
})
tmiClient.