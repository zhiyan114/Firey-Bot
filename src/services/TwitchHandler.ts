import tmi from 'tmi.js';
import { twitch } from '../config';
import { createEconData, econModel } from '../DBUtils/EconomyManager';
import { userDataModel } from '../DBUtils/UserDataManager';
import { LogType, sendLog } from '../utils/eventLogger';
import { isStreaming, streamStatus, twitchGetStreamType } from '../utils/twitchStream'
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
    // Check prefix to determine if this is a chat message or command
    if(message.slice(0,1) == twitch.prefix) {
        const args = message.split(" ")
        // command in question are switched
        switch(args[0].slice(1,args[0].length).toLowerCase()) {
            case "verify": {
                if(!args[1]) return await tmiClient.say(channel, `Hey, @${tags.username}, please make sure you supply your discord ID so that we can properly verify you!`);
                // Check if user input only contains number and has a valid length
                if(!/^\d+$/.test(args[1]) || args[1].length < 17) return await tmiClient.say(channel,`Hey, @${tags.username}, your discord ID seems to be incorrect, please check to make sure it's correct. If this is an error, please contact the bot operator.`);
                const userData = await userDataModel.findOne({
                    _id: args[1]
                })
                // Prompt user to join the discord before allowing them to verify
                if(!userData) return await tmiClient.say(channel, `Hey, @${tags.username}. It looks like your profile doesn't exist in our database, please join Firey's discord server, which can be found below, and link it there before trying again.`);
                // User haven't started the linking process
                if(!userData.twitch) return await tmiClient.say(channel,`Hey, @${tags.username}! Looks like we already have your profile, but you haven't started the linking process. Please use the /twitchlink command found in the discord server to get started.`);
                // User can't verify accounts that aren't linked to them lol
                if(userData.twitch.username != tags['username']) return await tmiClient.say(channel,`Hey, @${tags.username}! Looks like you didn't set this account as your linking account, please go back to discord and relink it.`);
                // User can't re-link or re-verify their account
                if(userData.twitch.verified) return await tmiClient.say(channel, `hey, @${tags.username}. It looks like your account has already been verified! If this is an error or you would like to change the account, please contact the bot operator.`);
                // Prevent multi-linking accounts
                const isVerified = await userDataModel.findOne({
                    "twitch.username": tags['username'],
                    "twitch.verified": true,
                })
                if(isVerified) return await tmiClient.say(channel, `Hey, @${tags.username}, another discord account has already linked this twitch account. If you believe this is a mistake, please contact the bot operator.`)
                // Users are passing all the checks, verify them now and update the AuthUsers
                await userDataModel.updateOne({_id: userData._id}, {
                    $set: {
                        "twitch.ID": tags['user-id'],
                        "twitch.verified": true,
                    }
                })
                if(isStreaming()) authUsers[tags['user-id']] = userData._id;
                await sendLog(LogType.Info,`${userData.username} has verified their twitch account with the database!`);
                await tmiClient.say(channel, `hey, @${tags.username}. Your account has been successfully verified!`);
                break;
            }
            case "checkstream": {
                await tmiClient.say(channel, `Hey, @${tags.username}. The stream state is ${isStreaming()}`)
                break;
            }
            default: {
                await tmiClient.say(channel,`hey, @${tags.username}, I believe that you may have typed the wrong command. If you didn't send a command, perhapse you've used my command prefix; thus, registered as you as trying to run a command.`);
                break;
            }
        }
        // You cant get awarded for using commands lol
        return;
    }
    // Check if the server is active before giving out the points
    if(isStreaming()) {
        // Don't award the points to the user until they verify their account on twitch
        if(authUsers[tags['user-id']] == "-1") return;
        // User is not on the temp AuthUsers list, check if they're verified or not
        if(!authUsers[tags['user-id']]) {
            const userData = await userDataModel.findOne({
                "twitch.ID": tags['user-id']
            })
            if(!userData || !userData.twitch?.verified) return authUsers[tags['user-id']] = "-1";
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
        // Now that user has their ID cached, give them the reward
        const userEconData = await econModel.findOne({_id: authUsers[tags['user-id']]})
        // Don't grant point if they've already received one within a minute
        if(!userEconData || userEconData.lastGrantedPoint.getTime() > (new Date()).getTime() - 60000) return;
        const econResult = await econModel.updateOne({_id: authUsers[tags['user-id']]},{
            $set: {
                lastGrantedPoint: new Date()
            },
            $inc: {
                points: getRewardPoints(),
            },
        })
        // If user doesn't exist on the Econ Collection, create a new entry for them
        if(econResult.matchedCount == 0) await createEconData(authUsers[tags['user-id']]);
    }
    
})
streamStatus.on('start',async (data: twitchGetStreamType)=>{
    // Twitch Stream Started
    authUsers = {};
    // Notify all the users in the server that his stream started
    const channel = await botClient.channels.fetch(twitch.discordChannelID) as TextChannel | null;
    if(!channel) return;
    const streamData = data.data[0];
    streamData.thumbnail_url = streamData.thumbnail_url.replace("{width}","500");
    streamData.thumbnail_url = streamData.thumbnail_url.replace("{height}","500");
    const streamUrl = `https://twitch.tv/${streamData.user_name}`
    const embed = new EmbedBuilder()
        .setColor("#00FFFF")
        .setAuthor({name: `${streamData.user_name} do be streaming right now!`, url: streamUrl})
        .setTitle(streamData.title)
        .setDescription(`Currently streaming ${streamData.game_name} with ${streamData.viewer_count} viewers`)
        .setURL(streamUrl)
        .setImage(streamData.thumbnail_url);
    await channel.send({content: `<@&${twitch.roleToPing}> Derg is streaming right now, come join!`, embeds: [embed]})
    
})
streamStatus.on('end',()=>{
    // Twitch Stream Ended
    authUsers = {};
})