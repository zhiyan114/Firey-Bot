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
    } catch {
        return;
    }
}