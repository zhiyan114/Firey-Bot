import { ChannelType } from 'discord.js';
import Mongoose from 'mongoose';
import { client } from '../index';
import { isConnected } from '../utils/DatabaseManager';

const econSchema = new Mongoose.Schema({
    userID: {
        type: String,
        required: true,
    },
    username: {
        type: Number,
        required: true,
    },
    points: {
        type: Number,
        required: true,
    },
    lastGrantedPoint: {
        type: Date,
        required: true,
    },
})

// Random Value Generator
function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Grant currency based on chats
client.on('messageCreate', async (message) => {
    // Do not proceed if the database is not connected
    if(!isConnected()) return;
    // Prevent bot from participating
    if(message.author.bot) return;
    // Prevent users that aren't in guild chat from participating (such as bot's DM)
    if(message.channel.type != ChannelType.GuildText && message.channel.type != ChannelType.GuildVoice) return;
    const document = Mongoose.model("economy",econSchema);
    const docIdentifier = {userID: message.author.id};
    const pointsToGrant = getRandomInt(5,10);
    const userEconData = await document.findOne(docIdentifier);
    // Check if the user already existed
    if(userEconData) {
        // Don't grant point if they've already received one within a minute
        if(userEconData.lastGrantedPoint.getTime() > (new Date()).getTime() - 60000) return;
        // Grant The Point
        await document.updateOne(docIdentifier, {
            $set: {
                username: message.author.tag,
                points: userEconData.points +pointsToGrant,
                LastGrantedPoint: (new Date()).getTime(),
            }
        })
        return;
    }
    // User doesn't exist, create a new entry and grant it some point
    await document.create({
        userID: message.author.id,
        username: message.author.tag,
        points: getRandomInt(5,10),
        LastGrantedPoint: (new Date()).getTime()
    })
})