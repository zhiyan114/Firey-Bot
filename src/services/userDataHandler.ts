import { guildID, newUserRoleID } from '../config';
import { createUserData, userDataModel } from '../DBUtils/UserDataManager';
import {client} from '../index';

client.on('userUpdate',async (oldUser, newUser)=>{
    if(newUser.bot) return;
    if(oldUser.tag != newUser.tag) {
        const result = await userDataModel.updateOne({_id: newUser.id}, {$set: {username: newUser.tag}});
        // User doesn't exist on the database, perhapse they haven't confirm the rules? or Firey, did u gave them the role?!?!?! >:(
        if(result.matchedCount == 0)  {
            const userHasVerifiedRole = (await client.guilds.cache.find(g=>g.id == guildID)?.members.fetch(newUser))?.roles.cache.find(role=>role.id == newUserRoleID);
            await createUserData(newUser, userHasVerifiedRole ? (new Date()) : undefined);
        }
    }
})