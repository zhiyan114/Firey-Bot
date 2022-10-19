/*
User Data to collect:
* _id (string) - User's discord ID
* username (string) - discord member's username
* rulesConfirmed (Date) - When did the user confirm the rules (changes after user rejoins the server and reconfirms);
* twitchUser (string) - Twitch's username
* lastTwitchUpdate (Date) - Last twitch's username update (7-days cooldown purposes)

Data will remain in the database even if the user leaves the server. 
*/

import { GuildMember, User } from 'discord.js';
import Mongoose from 'mongoose';
import { isConnected } from '../utils/DatabaseManager';

type userDataType = {
    _id: string;
    username: string;
    rulesConfirmed: Date;
    twitchUser: string;
    lastTwitchUpdate: Date;

}

const userDataSchema = new Mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    rulesConfirmed: {
        type: Date,
        required: false,
    },
    twitchUser: {
        type: String,
        required: false,
    },
    lastTwitchUpdate: {
        type: Date,
        required: false,
    }
}, {_id: false})

export const userDataModel = Mongoose.model<userDataType>("userData",userDataSchema);

export const createUserData = async (user: User | GuildMember, isVerified?: Date) => {
    if(!isConnected) return;
    if(user instanceof GuildMember) user = user.user;
    if(user.bot) return;
    await userDataModel.create({
        _id: user.id,
        username: user.username,
        rulesConfirmed: isVerified
    })
}