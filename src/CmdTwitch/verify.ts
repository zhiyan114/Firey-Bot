import { userDataModel } from '../DBUtils/UserDataManager';
import { LogType, sendLog } from '../utils/eventLogger';
import { streamCli } from '../index';
import { twitchCmdType } from './index';


const VerifyFunc : twitchCmdType ={
    name: "verify",
    func: async (data) => {
        const args = data.args;
        if(!data.user['user-id']) return;
        if(!args[1]) return await data.client.say(data.channel, `@${data.user.username}, please make sure you supply your discord ID so that we can properly verify you!`);
        // Check if user input only contains number and has a valid length
        if(!/^\d+$/.test(args[1]) || args[1].length < 17) return await data.client.say(data.channel,`@${data.user.username}, you have provided an invalid discord ID.`);
        const userData = await userDataModel.findOne({
            _id: args[1]
        })
        // Prompt user to join the discord before allowing them to verify
        if(!userData) return await data.client.say(data.channel, `@${data.user.username}, your discord ID doesn't exist in the database, please join the server and confirm the rules so that it can be added.`);
        // User haven't started the linking process
        if(!userData.twitch || !userData.twitch.username) return await data.client.say(data.channel,`@${data.user.username}, this discord account does not have an account linked to it. Please make sure you link your twitch account in the discord server first by using /twitchlink command.`);
        // User can't verify accounts that aren't linked to them lol
        if(userData.twitch.username != data.user['username']) return await data.client.say(data.channel,`@${data.user.username}, you cannot link other people's account.`);
        // User can't re-link or re-verify their account
        if(userData.twitch.verified) return await data.client.say(data.channel, `@${data.user.username}, this twitch account has already been linked.`);
        // Prevent multi-linking accounts
        const isVerified = await userDataModel.findOne({
            "twitch.username": data.user['username'],
            "twitch.verified": true,
        })
        if(isVerified) return await data.client.say(data.channel, `@${data.user.username}, this account has already been linked on another discord account. If you believe this is an error, please contact the bot operator.`)
        // Users are passing all the checks, verify them now and update the AuthUsers
        await userDataModel.updateOne({_id: userData._id}, {
            $set: {
                "twitch.ID": data.user['user-id'],
                "twitch.verified": true,
            }
        })
        if(streamCli.isStreaming) data.authUsers[data.user['user-id']] = userData._id;
        await sendLog(LogType.Info,`${userData.username} has verified their twitch account with the database!`);
        await data.client.say(data.channel, `@${data.user.username}, your account has been successfully verified!`);
    } 
 }

 export default VerifyFunc;