import { guildID, newUserRoleID } from '../config';
import { createUserData } from '../DBUtils/UserDataManager';
import { prisma } from '../utils/DatabaseManager';
import {client} from '../index';

client.on('userUpdate',async (oldUser, newUser)=>{
    if(newUser.bot) return;
    if(!prisma) return;
    if(oldUser.tag != newUser.tag) {
        const result = await prisma.members.update({
            data: {
                tag: newUser.tag
            },
            where: {
                id: newUser.id
            }
        });
        // User doesn't exist on the database, perhapse they haven't confirm the rules? or Firey, did u gave them the role?!?!?! >:(
        if(!result)  {
            const userHasVerifiedRole = (await client.guilds.cache.find(g=>g.id == guildID)?.members.fetch(newUser))?.roles.cache.find(role=>role.id == newUserRoleID);
            await createUserData(newUser, userHasVerifiedRole ? (new Date()) : undefined);
        }
    }
})