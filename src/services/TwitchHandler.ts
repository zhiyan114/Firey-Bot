import tmi from 'tmi.js';
import { twitch } from '../config';
import { econModel } from '../DBUtils/EconomyManger';
import { userDataModel } from '../DBUtils/UserDataManager';
import { LogType, sendLog } from '../utils/eventLogger';
import streamStatus, { isStreaming } from '../utils/twitchStream'
import { getRewardPoints } from './EconomyHandler';

type stringObject = {
    [key: string]: string
}

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

// list of twitch users that haven't link to their discord channel. This is to prevent unnecessary database call everytime when user chats
let AuthUsers: stringObject = {}

tmiClient.on('message', async (channel, tags, message, self)=>{
    if(self) return;
    if(!tags['user-id']) return;
    // Check prefix to determine if this is a chat message or command
    if(message.slice(0,1) == twitch.prefix) {
        // @TODO: Finish the command system
        const args = message.split(" ")
        const command = args[0].slice(1,args[0].length);

        // You cant get awarded for using the commands lol
        return;
    }
    // Check if the server is active before giving out the points
    if(isStreaming()) {
        // Don't award the points to the user until they verify their account on twitch
        if(AuthUsers[tags['user-id']] == "-1") return;
        // User is not on the temp AuthUsers list, check if they're verified or not
        if(!AuthUsers[tags['user-id']]) {
            const userData = await userDataModel.findOne({
                twitch: {
                    ID: tags['user-id']
                }
            })
            if(!userData || !userData.twitch?.verified) return AuthUsers[tags['user-id']] = "-1";
            AuthUsers[tags['user-id']] = userData._id;
            if(tags['username'] && tags['username'] != userData.twitch.username) {
                // User probably has a new username, update them.
                await userDataModel.updateOne({_id: userData._id},{
                    $set: {
                        twitch: {
                            username: tags['username']
                        }
                    },
                })
            }
            sendLog(LogType.Info,`${userData.username} has verified their twitch account with the database!`);
        }
        // Now that user has their ID cached, give them the reward
        const userEconData = await econModel.findOne({_id: AuthUsers['user-id']})
        // Don't grant point if they've already received one within a minute
        if(!userEconData || userEconData.lastGrantedPoint.getTime() > (new Date()).getTime() - 60000) return;
        await econModel.updateOne({_id: AuthUsers['user-id']},{
            $set: {
                lastGrantedPoint: new Date()
            },
            $inc: {
                points: getRewardPoints(),
            },
        })
    }
    
})
streamStatus.on('start',()=>{
    // Twitch Stream Started
    AuthUsers = {};
})
streamStatus.on('end',()=>{
    // Twitch Stream Ended
    AuthUsers = {};
})