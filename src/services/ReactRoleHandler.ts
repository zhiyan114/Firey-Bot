import { Client, TextChannel, MessageReaction, User } from 'discord.js';

// Internal Interface
interface IReactRoleList {
    [key: string]: string;
}

const AllRolesGrant : IReactRoleList = {
    "907314933648199700": "908723067067437076", // Derg Gaming Role
    "941368077856161885": "946613137031974963", // Derg Showing Role
    // "Emote ID": "Role ID"
}
const filterEmotes = Object.entries(AllRolesGrant).map(([k,_]) => k);
export default async (client : Client) => {
    const guild = await client.guilds.cache.find(opt=>opt.id == "906899666656956436")
    const message = await (guild.channels.cache.find(opt=>opt.id == "908719210040008755") as TextChannel).messages.fetch("908723313281482762");
    const deleteFilter = (reaction : MessageReaction, user : User) => filterEmotes.includes(reaction.emoji.id);
    const collector = message.createReactionCollector({filter: deleteFilter, dispose: true});
    collector.on('collect', async (react : MessageReaction, user : User) => {
        const member = guild.members.cache.find(opt=>opt.id == user.id);
        const role = guild.roles.cache.find(opt=>opt.id == AllRolesGrant[react.emoji.id]);
        await member.roles.add(role);
    });
    collector.on('remove',async (react,user)=>{
        const member = guild.members.cache.find(opt=>opt.id == user.id);
        const role = guild.roles.cache.find(opt=>opt.id == AllRolesGrant[react.emoji.id]);
        await member.roles.remove(role);
    })
}