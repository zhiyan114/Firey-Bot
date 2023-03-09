import { GuildMember, SlashCommandBuilder, TextChannel } from "discord.js";
import { adminRoleID, welcomeChannelID } from "../config";
import { ICommand } from "../interface";
import { DiscordUser } from "../ManagerUtils/DiscordUser";

export default {
    command: new SlashCommandBuilder()
    .setName('softban')
    .setDescription(`Kicks the user but also deletes their messgae.`)
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to softban.')
            .setRequired(true)
    )
    .addStringOption(option=>
        option.setName("reason")
            .setDescription("The reason for the softban, user will see this.")
            .setRequired(true)
    )
    .addBooleanOption(option=>
        option.setName("invite")
            .setDescription("Whether or not to include a one-time use invite link for the user to join back.")
            .setRequired(true)
    ),
    permissions: {
        roles: [adminRoleID]
    },
    function: async (interaction)=>{
        if(!interaction.guild) return await interaction.reply("Interaction must be executed in a server")
        const targetMember = interaction.options.getMember('user') as GuildMember | null;
        if(!targetMember) return await interaction.reply("Invalid User has been supplied");
        const reason = interaction.options.get('reason', true).value as string;
        const invite = interaction.options.get('invite', true).value as boolean;
        const targetUser = new DiscordUser(targetMember.user);
        await interaction.deferReply({ephemeral: true});
        const sbanfield = [
            {
                name: "Reason",
                value: reason,
            },
            {
                name: "Soft Banned By",
                value: interaction.user.tag,
            }
        ]
        if(invite) {
            const inviteLink = await (interaction.guild?.channels.cache.find(channel => channel.id === welcomeChannelID) as TextChannel).createInvite({maxAge: 604800, maxUses: 1, reason: "Moderator attached invitation link for this softban action"});
            sbanfield.push({
                name: "Invite Link",
                value: inviteLink.url,
            })
        }
        await targetUser.sendMessage({
            title: "softban",
            message: `You have been softban from ${interaction.guild.name}!${invite ? " A re-invite link has been attached to this softban (expires in 1 week)." : ""}`,
            color: "#FFA500",
            fields: sbanfield
        })
        await targetMember.ban({
            reason,
            deleteMessageSeconds: 604800
        });
        await interaction.guild?.bans.remove(targetMember.user, "Softban purposes");
        await (new DiscordUser(interaction.user)).actionLog({
            actionName: "unban",
            target: targetUser,
            message: `<@${targetMember.id}> has been softban by <@${interaction.user.id}>`,
            reason
        });
        await interaction.followUp({content: 'User has been successfully softban!', ephemeral: true});
    },
    disabled: false,
} as ICommand;