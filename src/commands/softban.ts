import { EmbedBuilder, GuildMember, SlashCommandBuilder, TextChannel } from "discord.js";
import { adminRoleID } from "../config";
import { ICommand } from "../interface";
import { LogType, sendLog } from "../utils/eventLogger";

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
        const targetMember = interaction.options.getMember('user') as GuildMember | undefined;
    if(!targetMember) return await interaction.reply("Invalid User has been supplied");
        const reason = interaction.options.get('reason', true).value as string;
        const invite = interaction.options.get('invite', true).value as boolean;
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('softban')
            .setDescription(`You have been softban from ${interaction.guild!.name}!${invite ? " A re-invite link has been attached to this softban (expires in 1 week)." : ""}`)
            .addFields({name: "Reason", value: reason})
            .setFooter({text: `softban by ${interaction.user.tag}`})
            .setTimestamp();
        if(invite) {
            const inviteLink = await (interaction.guild!.channels.cache.find(channel => channel.id == "907311644076564511") as TextChannel).createInvite({maxAge: 604800, maxUses: 1, reason: "Moderator attached invitation link for this softban action"});
            embed.addFields({name: "Invite Link", value: inviteLink.url});
        }
        await targetMember.send({embeds:[embed]});
        await targetMember.ban({deleteMessageSeconds: 604800, reason: reason});
        await interaction.guild?.bans.remove(interaction.options.getUser('user', true), "Softban Action");
        await interaction.reply({content: 'User has been successfully softban!', ephemeral: true});
        await sendLog(LogType.Interaction, `${interaction.user.tag} has executed **softban** command`, {
            target: targetMember.user.tag,
            reason: reason,
            includeInvite: invite.toString(),
        });
    },
    disabled: false,
} as ICommand;