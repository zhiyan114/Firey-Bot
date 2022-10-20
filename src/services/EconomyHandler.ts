import { ChannelType } from 'discord.js';
import { client } from '../index';
import { isConnected } from '../utils/DatabaseManager';
import { createEconData, econModel, getRewardPoints } from '../DBUtils/EconomyManager';


// Grant currency based on chats
client.on('messageCreate', async (message) => {
    // Do not proceed if the database is not connected
    if(!isConnected()) return;
    // Prevent bot from participating
    if(message.author.bot) return;
    // Prevent users that aren't in guild chat from participating (such as bot's DM)
    if(message.channel.type != ChannelType.GuildText && message.channel.type != ChannelType.GuildVoice) return;
    const docIdentifier = {_id: message.author.id};
    const pointsToGrant = getRewardPoints();
    const userEconData = await econModel.findOne(docIdentifier);
    // Check if the user already existed
    if(userEconData) {
        // Don't grant point if they've already received one within a minute
        if(userEconData.lastGrantedPoint.getTime() > (new Date()).getTime() - 60000) return;
        // Grant The Point
        await econModel.updateOne(docIdentifier, {
            points: userEconData.points + pointsToGrant,
            lastGrantedPoint: new Date(),
        })
        return;
    }
    // User doesn't exist, create a new entry and grant it some point
    await createEconData(message.author.id);
})