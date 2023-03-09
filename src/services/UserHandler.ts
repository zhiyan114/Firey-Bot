import { EmbedBuilder, GuildMember, TextChannel, DiscordAPIError, ActivityType } from "discord.js";
import * as Sentry from '@sentry/node';
import { welcomeChannelID, guildID, newUserRoleID } from '../config';
import { client } from "../index"
import { APIErrors } from '../utils/discordErrorCode';
import { DiscordUser } from "../ManagerUtils/DiscordUser";
import { BannerPic } from "../utils/bannerGen";

client.on('guildMemberAdd',async (member : GuildMember) => {
    // ignore if user is a bot
    if(member.user.bot) return;
    // Send message to channel 907121158376288307
    const channel = await client.channels.fetch(welcomeChannelID) as TextChannel;
    const bannerBuffer = await (new BannerPic()).generate(member.user.tag, member.user.displayAvatarURL({size: 512}))
    await channel.send({files: [bannerBuffer]});
    // Send the message to the user
    const embed = new EmbedBuilder()
        .setTitle("Welcome to the server!")
        .setDescription(`Welcome to the Derg server, ${member.user.username}! Please read the rules and press the confirmation button to get full access.`)
        .setColor("#0000FF")
    try {
        await member.send({embeds: [embed]});
    } catch(ex : unknown) {
        if(ex instanceof DiscordAPIError && ex.code === APIErrors.CANNOT_MESSAGE_USER)
            channel.send({content:`||<@${member.user.id}> You've received this message here because your DM has been disabled||`, embeds: [embed]});
        else Sentry.captureException(ex);
    }
    if(client.user) {
        client.user.setPresence({
            status: "dnd",
            activities: [{
              name: `with ${client.guilds.cache.find(g=>g.id===guildID)?.memberCount} cuties :3`,
              type: ActivityType.Competing,
            }]
        })
    }
    // Add the user to the database
    const user = new DiscordUser(member.user);
    const addSuccess = await user.updateUserData({
        method: "create"
    });
    // Update the user data if the user already existed
    if (!addSuccess) await user.updateUserData({
        method: "update",
        tag: member.user.tag,
    })
});

/* Do some stuff when user's profile updates */
client.on('userUpdate',async (oldUser, newUser)=>{
    if(newUser.bot) return;
    const user = new DiscordUser(newUser)
    if(oldUser.tag !== newUser.tag) {
        const userUpdated = await user.updateUserData({
            method: "update",
            tag: newUser.tag
        })
        if(!userUpdated) {
            const userHasVerifiedRole = (await client.guilds.cache.find(g=>g.id === guildID)?.members.fetch(newUser))?.roles.cache.find(role=>role.id === newUserRoleID);
            await user.updateUserData({
                method: "create",
                rulesconfirmedon: userHasVerifiedRole ? new Date() : undefined
            })
        }
    }
})

/* Do some member leave stuff, which is nothing. */
/*
    Privacy Users: The reason why the data isn't automatically deleted when user leaves if because when it deletes, all of the associated data will be deleted, 
    including their total accumulated points. This will also be called when user gets kicked or templorary banned, which we dont want their points to be
    deleted.
*/
client.on('guildMemberRemove', ()=>{
    if(!client.user) return;
    client.user.setPresence({
        status: "dnd",
        activities: [{
          name: `with ${client.guilds.cache.find(g=>g.id===guildID)?.memberCount} cuties :3`,
          type: ActivityType.Competing,
        }]
    })
})