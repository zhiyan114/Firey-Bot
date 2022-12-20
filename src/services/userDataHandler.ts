import { guildID, newUserRoleID } from '../config';
import { createUserData, updateUserData } from '../DBUtils/UserDataManager';
import { prisma } from '../utils/DatabaseManager';
import {client} from '../index';

client.on('userUpdate',async (oldUser, newUser)=>{
    if(newUser.bot) return;
    if(!prisma) return;
    if(oldUser.tag != newUser.tag) {
        const userUpdated = await updateUserData(newUser, {
            tag: newUser.tag,
        })
        if(!userUpdated) {
            const userHasVerifiedRole = (await client.guilds.cache.find(g=>g.id == guildID)?.members.fetch(newUser))?.roles.cache.find(role=>role.id == newUserRoleID);
            await createUserData(newUser, userHasVerifiedRole ? (new Date()) : undefined);
        }
    }
})