import { SlashCommandBuilder } from '@discordjs/builders';
import { EmbedBuilder, CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { userRoleManager } from '../utils/roleManager';
import { sendLog, LogType } from '../utils/eventLogger';
import { adminRoleID }  from '../config';
/* Command Builder */
const KickCmd = new SlashCommandBuilder()
    .setName('kick')
    .setDescription(`Kicks a target user.`)
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to kick.')
            .setRequired(true)
    )
    .addStringOption(option=>
        option.setName("reason")
            .setDescription("The reason for the kick, user will see this.")
            .setRequired(true)
    )
    .addBooleanOption(option=>
        option.setName("invite")
            .setDescription("Whether or not to include a one-time use invite link for the user to join back.")
            .setRequired(true)
    )

/* Function Builder */
const KickFunc = async (interaction : CommandInteraction) => {
    if (!(new userRoleManager(interaction.member as GuildMember)).check(adminRoleID)) return await interaction.reply({content: 'Access Denied!', ephemeral: true}); // Permission Check
    /* Get the supplied information */
    const targetMember = interaction.options.getMember('user') as GuildMember;
    const reason = interaction.options.get('reason',true).value as string;
    const invite = interaction.options.get('invite',true).value as boolean;
    const Fields = [
        
    ]
    const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('Kicked')
        .setDescription(`You have been kicked from ${interaction.guild!.name}! ${invite ? "A re-invite link has been attached to this message (expires in 1 week)." : ""}`)
        .addFields({name: "Reason", value: reason})
        .setFooter({text: `Kicked by ${interaction.user.username}#${interaction.user.discriminator}`})
        .setTimestamp();
    if(invite) {
        const inviteLink = await (interaction.guild!.channels.cache.find(channel => channel.id == "907311644076564511") as TextChannel).createInvite({maxAge: 604800, maxUses: 1, reason: "Moderator attached invitation link for this kick action"});
        embed.addFields({name: "Invite Link", value: inviteLink.url});
    }
    await targetMember.send({embeds:[embed]});
    await targetMember.kick(reason);
    await interaction.reply({content: 'User has been successfully kicked!', ephemeral: true});
    await sendLog(LogType.Interaction, `${interaction.user.tag} has executed **kick** command`, {
        target: targetMember.user.tag,
        reason: reason,
        includeInvite: invite.toString(),
    });
}

export default {
    command: KickCmd,
    function: KickFunc,
    disabled: false,
}