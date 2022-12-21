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

import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { captureException } from '@sentry/node';
import { GuildMember, User } from 'discord.js';
import { prisma } from '../utils/DatabaseManager';

export const createUserData = async (user: User | GuildMember, isVerified?: Date) => {
    if(!prisma) return;
    if(user instanceof GuildMember) user = user.user;
    if(user.bot) return;
    try {
        await prisma.members.create({
            data: {
                id: user.id,
                tag: user.tag,
                rulesconfirmedon: isVerified
            }
        })
    } catch(ex) {
        if(ex instanceof PrismaClientKnownRequestError) return;
        captureException(ex)
    }
}
type DataType = {
    tag?: string,
    rulesconfirmedon?: Date,
}
export const updateUserData = async(user: User | GuildMember, Data: DataType): Promise<boolean> => {
    if(!prisma) return false;
    if(user instanceof GuildMember) user = user.user;
    if(user.bot) return false;
    try {
        await prisma.members.update({
            data: {
                rulesconfirmedon: Data.rulesconfirmedon,
                tag: Data.tag
            },
            where: {
                id: user.id
            },
            
        })
        return true;
    } catch(ex) {
        // User Data not found
        if(ex instanceof PrismaClientKnownRequestError && ex.code === "P2025") return false;
        captureException(ex);
        return false;
    }
}