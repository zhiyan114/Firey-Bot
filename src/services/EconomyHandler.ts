import { ChannelType } from 'discord.js';
import { client } from '../index';
import { prisma } from '../utils/DatabaseManager';
import { noPointsChannel } from '../config';
import { DiscordUser } from '../ManagerUtils/DiscordUser';


// Grant currency based on chats
client.on('messageCreate', async (message) => {
    // Do not proceed if the database is not connected
    if(!prisma) return;
    // Prevent bot from participating
    if(message.author.bot) return;
    // Prevent DM from being awarded points
    if(message.channel.type == ChannelType.DM) return;
    // Prevent points from being awarded to blacklisted channels
    if(noPointsChannel.find((c)=> c === message.channel.id)) return;
    // Grant the user the points
    await (new DiscordUser(message.author)).economy.grantPoints();
})