import tmi from 'tmi.js';
import { twitch } from '../config';
import { createEconData, econModel } from '../DBUtils/EconomyManager';
import { userDataModel } from '../DBUtils/UserDataManager';
import { LogType, sendLog } from '../utils/eventLogger';
import { isStreaming, streamStatus, getStreamData } from '../utils/twitchStream'
import { getRewardPoints } from '../DBUtils/EconomyManager';
import {client as botClient} from '../index'
import { EmbedBuilder, TextChannel } from 'discord.js';

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
    channels: [twitch.channel],
})

tmiClient.connect().then(()=>{
    sendLog(LogType.Info, "Twitch Bot Connected!")
})

// list of twitch users that haven't link to their discord channel. This is to prevent unnecessary database call everytime when user chats
let authUsers: stringObject = {}

// @TODO: Organize this hot mess lmfao
tmiClient.on('message', async (channel, tags, message, self)=>{
    if(self) return;
    if(!tags['user-id'] || !tags['username']) return;
    // User is not on the temp AuthUsers list, check if they're verified or not (if the stream is started)
    if(!authUsers[tags['user-id']] && isStreaming()) {
        const userData = await userDataModel.findOne({
            "twitch.ID": tags['user-id']
        })
        if(userData && userData.twitch && userData.twitch.verified) {
            // User is on the database
            authUsers[tags['user-id']] = userData._id;
            if(tags['username'] != userData.twitch.username) {
                // User probably has a new username, update them.
                await userDataModel.updateOne({_id: userData._id},{
                    $set: {
                        "twitch.username": tags['username']
                    },
                })
            }
        }
        if(!authUsers[tags['user-id']]) authUsers[tags['user-id']] = "-1";
    }
    // Check prefix to determine if this is a chat message or command
    if(message.slice(0,1) == twitch.prefix) {
        const args = message.split(" ")
        // command in question are switched
        switch(args[0].slice(1,args[0].length).toLowerCase()) {
            case "verify": {
                if(!args[1]) return await tmiClient.say(channel, `@${tags.username}, please make sure you supply your discord ID so that we can properly verify you!`);
                // Check if user input only contains number and has a valid length
                if(!/^\d+$/.test(args[1]) || args[1].length < 17) return await tmiClient.say(channel,`@${tags.username}, you have provided an invalid discord ID.`);
                const userData = await userDataModel.findOne({
                    _id: args[1]
                })
                // Prompt user to join the discord before allowing them to verify
                if(!userData) return await tmiClient.say(channel, `@${tags.username}, your discord ID doesn't exist in the database, please join the server and confirm the rules so that it can be added.`);
                // User haven't started the linking process
                if(!userData.twitch) return await tmiClient.say(channel,`@${tags.username}, this discord account does not have an account linked to it. Please make sure you link your twitch account in the discord server first by using /twitchlink command.`);
                // User can't verify accounts that aren't linked to them lol
                if(userData.twitch.username != tags['username']) return await tmiClient.say(channel,`@${tags.username}, your twitch account has already been linked.`);
                // User can't re-link or re-verify their account
                if(userData.twitch.verified) return await tmiClient.say(channel, `@${tags.username}, this twitch account has already been linked on another discord account.`);
                // Prevent multi-linking accounts
                const isVerified = await userDataModel.findOne({
                    "twitch.username": tags['username'],
                    "twitch.verified": true,
                })
                if(isVerified) return await tmiClient.say(channel, `@${tags.username}, this account has already been linked on another discord account. If you believe this is an error, please contact the bot operator.`)
                // Users are passing all the checks, verify them now and update the AuthUsers
                await userDataModel.updateOne({_id: userData._id}, {
                    $set: {
                        "twitch.ID": tags['user-id'],
                        "twitch.verified": true,
                    }
                })
                if(isStreaming()) authUsers[tags['user-id']] = userData._id;
                await sendLog(LogType.Info,`${userData.username} has verified their twitch account with the database!`);
                await tmiClient.say(channel, `@${tags.username}, your account has been successfully verified!`);
                break;
            }
            case "getpoints": {
                if(authUsers[tags['user-id']] == "-1") return tmiClient.say(channel,`@${tags.username}, your account is not linked yet. Do that first then try again.`);
                let discordUserID = authUsers[tags['user-id']];
                if(!discordUserID) {
                    // Get the user ID since it's not available when the stream is offline
                    const userData = await econModel.findOne({"twitch.ID": tags['user-id']});
                    if(userData) discordUserID = userData._id
                }
                // Fetch the points
                const econData = await econModel.findOne({_id: discordUserID})
                if(!econData) return await tmiClient.say(channel,`${tags.username}, you have 0 points!`);
                await tmiClient.say(channel,`@${tags.username}, you have ${econData?.points} points!`);
                break;
            }
            case "checkstream": {
                await tmiClient.say(channel, `@${tags.username}, the stream state is ${isStreaming()}`)
                break;
            }
            default: {
                await tmiClient.say(channel,`@${tags.username}, command not found.`);
                break;
            }
        }
        // You cant get awarded for using commands lol
        return;
    }
    // Check if the server is active before giving out the points
    if(isStreaming()) {
        // Don't award the points to the user until they verify their account on twitch
        if(!authUsers[tags['user-id']] || authUsers[tags['user-id']] == "-1") return;
        // Now that user has their ID cached, give them the reward
        const userEconData = await econModel.findOne({_id: authUsers[tags['user-id']]})
        // If user's econ data does not exist, create one for them. This shouldn't happen unless the user managed to not talk in the server at all before verifying.
        if(!userEconData) return await createEconData(authUsers[tags['user-id']]);
        // Don't grant point if they've already received one within a minute
        if(userEconData.lastGrantedPoint.getTime() > (new Date()).getTime() - 60000) return;
        await econModel.updateOne({_id: authUsers[tags['user-id']]},{
            $set: {
                lastGrantedPoint: new Date()
            },
            $inc: {
                points: getRewardPoints(),
            },
        })
    }
    
})
streamStatus.on('start',async (streamData: getStreamData)=>{
    // Twitch Stream Started
    authUsers = {};
    // Notify all the users in the server that his stream started
    const channel = await botClient.channels.fetch(twitch.discordChannelID) as TextChannel | null;
    if(!channel) return;
    streamData.thumbnail_url = streamData.thumbnail_url.replace("{width}","1280");
    streamData.thumbnail_url = streamData.thumbnail_url.replace("{height}","720");
    const streamUrl = `https://twitch.tv/${streamData.user_name}`
    const embed = new EmbedBuilder()
        .setColor("#00FFFF")
        .setAuthor({name: `${streamData.user_name} do be streaming right now!`, url: streamUrl})
        .setTitle(streamData.title)
        .setDescription(`Currently streaming **${streamData.game_name}** with ${streamData.viewer_count} viewers`)
        .setURL(streamUrl)
        .setImage(streamData.thumbnail_url);
    await channel.send({content: `<@&${twitch.roleToPing}> Derg is streaming right now, come join!`, embeds: [embed]})
    
})
streamStatus.on('end',()=>{
    // Twitch Stream Ended
    authUsers = {};
})