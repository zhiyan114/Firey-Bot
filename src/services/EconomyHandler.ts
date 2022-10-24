import { ChannelType } from 'discord.js';
import { client } from '../index';
import { isConnected } from '../utils/DatabaseManager';
import { grantPoints } from '../DBUtils/EconomyManager';


// Grant currency based on chats
client.on('messageCreate', async (message) => {
    // Do not proceed if the database is not connected
    if(!isConnected()) return;
    // Prevent bot from participating
    if(message.author.bot) return;
    // Prevent users that aren't in guild chat from participating (such as bot's DM)
    if(message.channel.type != ChannelType.GuildText && message.channel.type != ChannelType.GuildVoice) return;
    await grantPoints(message.author.id);
})