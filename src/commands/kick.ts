import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { adminRoleID, welcomeChannelID }  from '../config';
import { ICommand } from '../interface';
import { DiscordUser } from '../ManagerUtils/DiscordUser';
/* Command Builder */
const KickCmd = new SlashCommandBuilder()
    .setName('kick')
    .setDescription(`Kicks a target user.`)
    .setDMPermission(false)
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
    // Validation Checks
    const targetMember = interaction.options.getMember('user') as GuildMember | undefined;
    if(!targetMember) return await interaction.reply("Invalid User has been supplied");

    // Get the supplied information
    const reason = interaction.options.get('reason',true).value as string;
    const invite = interaction.options.get('invite',true).value as boolean;
    const targetUser = new DiscordUser(targetMember.user);
    const issuerUser = new DiscordUser(interaction.user)
    await interaction.deferReply({ephemeral: true});

    // Prepare the embed data for the target user
    const kickField = [
        {
            name: "Reason",
            value: reason,
        },
        {
            name: "Kicked By",
            value: issuerUser.getUsername(),
        },
    ];
    if(invite) {
        const inviteLink = await (interaction.guild?.channels.cache.find(channel => channel.id === welcomeChannelID) as TextChannel).createInvite({
            maxAge: 604800,
            maxUses: 1,
            reason: "Moderator attached invitation link for this kick action"
        });
        kickField.push({
            name: "Invite Link",
            value: inviteLink.url
        })
    }

    // Notify the user and take action
    await targetUser.sendMessage({
        title: "Kicked",
        message: `You have been kicked from ${interaction.guild?.name}!${invite ? " A re-invite link has been attached to this message (expires in 1 week)." : ""}`,
        fields: kickField,
        color: "#FFFF00"
    })
    await targetMember.kick(reason);

    // Log it and cleanup
    await issuerUser.actionLog({
        actionName: "kick",
        target: targetUser,
        message: `<@${targetMember.id}> has been kicked by <@${interaction.user.id}>`,
        reason
    })
    await interaction.followUp({content: 'User has been successfully kicked!', ephemeral: true});
}

export default {
    command: KickCmd,
    permissions: {
        roles: [adminRoleID]
    },
    function: KickFunc,
    disabled: false,
} as ICommand;