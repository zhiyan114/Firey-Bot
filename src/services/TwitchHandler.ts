import tmi from 'tmi.js';
import { twitch } from '../config';
import {econModel, grantPoints } from '../DBUtils/EconomyManager';
import { userDataModel } from '../DBUtils/UserDataManager';
import { LogType, sendLog } from '../utils/eventLogger';
import { isStreaming, streamStatus, getStreamData } from '../utils/twitchStream'
import {client as botClient} from '../index'
import { EmbedBuilder, TextChannel } from 'discord.js';
import { twitchCmdType } from '../CmdTwitch';
import path from 'path';
import fs from 'fs';

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

/* Load all the internal commands */
interface ICommandList {
    [key: string]: twitchCmdType;
}
const twitchCmdList : ICommandList  = {};
const cmdDir = path.join(__dirname, '../', 'CmdTwitch');
for(let file of fs.readdirSync(cmdDir)) {
    if (file.endsWith('.js') && file != "index.js") {
        const cmdModule : twitchCmdType = require(path.join(cmdDir, file)).default;
        if(!cmdModule) continue;
        if(twitchCmdList[cmdModule.name]) continue; // Command already configured
        if(!cmdModule.disabled) twitchCmdList[cmdModule.name] = cmdModule;
    }
}

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
        // Get the command
        const cmdObj = twitchCmdList[args[0].slice(1,args[0].length).toLowerCase()];
        // Check if the command exist
        if(!cmdObj) return await tmiClient.say(channel,`@${tags.username}, command not found.`);
        // Run the command if it exist and return it since you cant get awarded for using it lol
        return await cmdObj.func({
            channel,
            user: tags,
            message,
            self,
            client: tmiClient,
            args,
            authUsers
        })
    }
    // Check if the server is active before giving out the points
    if(isStreaming()) {
        // Don't award the points to the user until they verify their account on twitch
        if(!authUsers[tags['user-id']] || authUsers[tags['user-id']] == "-1") return;
        // Now that user has their ID cached, give them the reward
        await grantPoints(authUsers[tags['user-id']]);
    }
    
})

// Event stuff
let discordReminder: NodeJS.Timeout | null;

const sendDiscordLink = async () => {
    await tmiClient.say(twitch.channel,`A quick reminder that my discord server exists! You can join here: ${twitch.discordInvite}`);
    if(isStreaming()) discordReminder = setTimeout(sendDiscordLink, twitch.reminderInterval);
}

streamStatus.on('start',async (streamData: getStreamData)=>{
    // Twitch Stream Started
    authUsers = {};
    // Start the discord link notification timer if it haven't started yet
    if(!discordReminder) discordReminder = setTimeout(sendDiscordLink, twitch.reminderInterval);
    // Notify all the users in the server that his stream started
    const channel = await botClient.channels.fetch(twitch.discordChannelID) as TextChannel | null;
    if(!channel) return;
    streamData.thumbnail_url = streamData.thumbnail_url.replace("{width}","1280").replace("{height}","720");
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
    // Clear the discord timer notification if channel stops streaming
    if(discordReminder) {
        clearTimeout(discordReminder);
        discordReminder = null;
    }
})

if(isStreaming()) discordReminder = setTimeout(sendDiscordLink, twitch.reminderInterval);
