/*
User Data to collect:
* _id (string) - User's discord ID
* username (string) - discord member's username
* rulesConfirmed (Date) - When did the user confirm the rules (changes after user rejoins the server and reconfirms);
* Twitch UserID - Persistant account identifier
* Twitch Username - Convient identifier
* Twitch Verification - Determine if their linked account has been verified or not

Data will remain in the database even if the user leaves the server. 
*/

import { GuildMember, User } from 'discord.js';
import Mongoose from 'mongoose';
import { isConnected } from '../utils/DatabaseManager';

export type userDataType = {
    _id: string;
    username: string;
    rulesConfirmed?: Date;
    twitch?: {
        ID: string,
        username: string,
        verified: boolean,
    };

}

const userDataSchema = new Mongoose.Schema<userDataType>({
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
    twitch: {
        ID: {
            type: String,
            required: false,
        },
        username: {
            type: String,
            required: false,
        },
        verified: {
            type: Boolean,
            required: false,
        }
    }
}, {_id: false})

export const userDataModel = Mongoose.model<userDataType>("userData",userDataSchema);
export const getUserData = async (userID: string) => {
    return await userDataModel.findOne({_id: userID})
}
export const createUserData = async (user: User | GuildMember, isVerified?: Date) => {
    if(!isConnected) return;
    if(user instanceof GuildMember) user = user.user;
    if(user.bot) return;
    if(await getUserData(user.id)) return;
    await userDataModel.create({
        _id: user.id,
        username: user.tag,
        rulesConfirmed: isVerified
    })
}