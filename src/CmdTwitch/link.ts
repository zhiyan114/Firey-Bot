import { TwitchUser } from '../ManagerUtils/TwitchUser';
import { prisma } from '../utils/DatabaseManager';
import { twitchCmdType } from './index';

const VerifyFunc : twitchCmdType ={
    name: "link",
    func: async (data) => {
        const discordID = data.args[1];
        if(!prisma) return;
        if(!data.user['user-id']) return;
        if(!data.user.username) return;
        const tUser = new TwitchUser(data.user['user-id'])
        const uData = await tUser.getCacheData();

        // Check to see if the user is already verified
        if(uData && uData.verified) return await data.client.say(data.channel,`@${data.user['display-name']} Your account has already been verified. Please contact zhiyan114 if you would like to relink it.`)
        if(!discordID) return await data.client.say(data.channel, `@${data.user.username}, please make sure you supply your discord ID so that we can properly verify you!`);
        // Check if user input only contains number and has a valid length
        if(!/^\d+$/.test(discordID) || discordID.length < 17) return await data.client.say(data.channel,`@${data.user.username}, you have provided an invalid discord ID.`);
        // Check to see if the user is trying to set the same discord ID (if yes, assuming they forgot their twitch ID for the verification)
        if(uData && uData.memberid === discordID) return await data.client.say(data.channel,`@${data.user.username}, No new discord ID has been set. Please use the tverify command in the discord server to complete the process.`)
        
        // Check if the discord account has already been claimed
        const tTotalAcc = await prisma.twitch.count({
            where: {
                memberid: discordID,
                verified: true
            }
        });
        if(tTotalAcc > 0) return await data.client.say(data.channel, `@${data.user.username}, unfortunately, this account has already been linked. Please contact zhiyan114 if this is a mistake.`);
        if(uData) {
            // user already existed, update the record
            await tUser.updateUser({
                memberid: discordID
            })
            return await data.client.say(data.channel, `@${data.user.username}, a new discord ID has been successfully attached to your account. Please use the tverify command in the discord server to complete the process.`)
        }
        // Assume the user doesn't exist and create one
        const dTotalAcc = await prisma.members.count({
            where: {
                id: discordID
            }
        });
        // Check to see if the member's profile already existed for the supplied discord ID
        if(dTotalAcc === 0) return await data.client.say(data.channel, `@${data.user.username}, account not found! Please make sure you have already joined our discord server.`)
        await tUser.createUser({
            username: data.user.username,
            memberid: discordID,
        })
        return await data.client.say(data.channel, `@${data.user.username}, your verification process has been started! Please use the tverify command in the discord server to complete the process.`)
    } 
 }

 export default VerifyFunc;