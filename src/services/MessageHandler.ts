import { ChannelType } from 'discord.js';
import { client } from '../index';
import { prisma } from '../utils/DatabaseManager';
import { noPointsChannel } from '../config';
import { DiscordUser } from '../ManagerUtils/DiscordUser';


// Grant currency based on chats
client.on('messageCreate', async (message) => {
    // Sanity checks: Ignore bot user, DM channel, and blacklisted channels
    if(!prisma) return;
    if(message.author.bot) return;
    if(message.channel.type === ChannelType.DM) return;
    if(noPointsChannel.find((c)=> c === message.channel.id)) return;
    
    // Grant the user the points
    await (new DiscordUser(message.author)).economy.chatRewardPoints(message.content);
})