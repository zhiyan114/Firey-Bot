import tmi from 'tmi.js';
import { twitch } from '../config';
import { prisma } from '../utils/DatabaseManager';
import { LogType, sendLog } from '../utils/eventLogger';
import { streamCli } from '../index';
import {client as botClient} from '../index'
import { EmbedBuilder, TextChannel } from 'discord.js';
import { twitchCmdType } from '../CmdTwitch';
import path from 'path';
import fs from 'fs';
import { clearTwitchCache, TwitchUser } from '../ManagerUtils/TwitchUser';
import { DiscordUser, getUser } from '../ManagerUtils/DiscordUser';

export const tmiClient = new tmi.Client({
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

/* Load all the internal commands */
interface ICommandList {
    [key: string]: twitchCmdType;
}
const twitchCmdList : ICommandList  = {};
const cmdDir = path.join(__dirname, '../', 'CmdTwitch');
for(let file of fs.readdirSync(cmdDir)) {
    if (file.endsWith('.js') && file !== "index.js") {
        const cmdModule : twitchCmdType = require(path.join(cmdDir, file)).default;
        if(!cmdModule) continue;
        if(twitchCmdList[cmdModule.name]) continue; // Command already configured
        if(!cmdModule.disabled) twitchCmdList[cmdModule.name] = cmdModule;
    }
}

tmiClient.on('message', async function(channel, tags, message, self){
    if(self) return;
    if(!prisma) return;
    if(!tags['user-id'] || !tags['username']) return;
    const tUser = new TwitchUser(tags['user-id']);
    const userData = await tUser.getCacheData();
    // Check if the user exists and is verified before performing username check
    if(userData && userData.verified) {
        if(tags['username'] !== userData.username) {
            await tUser.updateDataCache({
                username: tags['username']
            });
            await tUser.updateUser({
                method: "update",
                username: tags['username'],
            });
        }
    }
    // Check prefix to determine if this is a chat message or command
    message = message.trim(); // Remove all the whitespace around the message
    if(message.slice(0,1) === twitch.prefix) {
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
        })
    }
    // Check if the server is active before giving out the points
    if(streamCli.isStreaming) {
        // Don't award the points to the user until they verify their account on twitch
        const discordUser = await tUser.getDiscordUser();
        if(!(userData?.memberid) || userData.memberid === "-1" || !discordUser) return;
        // Now that user has their ID cached, give them the reward
        await discordUser.economy.chatRewardPoints(message);
    }
    
})

// Event stuff
let discordReminder: NodeJS.Timeout | null;

const sendDiscordLink = async () => {
    await tmiClient.say(twitch.channel,`A quick reminder that my discord server exists! You can join here: ${twitch.discordInvite}`);
    if(streamCli.isStreaming) discordReminder = setTimeout(sendDiscordLink, twitch.reminderInterval);
}

let lastStream: Date;
streamCli.on('start',async (streamData)=>{
    // Check last stream time before sending out notification (Patch for Firey's consistant stream issue; causing massive pings).
    if(lastStream && (new Date()).getTime() - lastStream.getTime() < 18000) return;
    // Twitch Stream Started
    await clearTwitchCache();
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
streamCli.on('end', async()=>{
    // Twitch Stream Ended
    await clearTwitchCache();
    // Clear the discord timer notification if channel stops streaming
    if(discordReminder) {
        clearTimeout(discordReminder);
        discordReminder = null;
    }
    lastStream = new Date();
})
