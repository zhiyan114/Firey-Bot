import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { sendLog, LogType } from '../utils/eventLogger';
import { adminRoleID }  from '../config';
import { ICommand } from '../interface';

/* Command Builder */
const BanCmd = new SlashCommandBuilder()
    .setName('ban')
    .setDescription(`Bans the target user.`)
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to ban.')
            .setRequired(true)
    )
    .addStringOption(option=>
        option.setName("reason")
            .setDescription("The reason for the ban, user will see this.")
            .setRequired(true)
    )
    .addBooleanOption(option=>
        option.setName("delete")
            .setDescription("Delete all messages from the user banned user.")
            .setRequired(true)
    );

/* Function Builder */
const BanFunc = async (interaction : CommandInteraction) => {
    const targetMember = interaction.options.getMember('user') as GuildMember;
    const reason = interaction.options.get('reason',true).value as string;
    const deleteMessages = interaction.options.get('delete',true).value as boolean;
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Banned')
        .setDescription(`You have been banned from ${interaction.guild!.name}!`)
        .setFields({name: "Reason", value: reason})
        .setFooter({text: `Banned by ${interaction.user.username}#${interaction.user.discriminator}`})
        .setTimestamp();
    await targetMember.send({embeds:[embed]});
    await targetMember.ban({deleteMessageSeconds: deleteMessages ? 604800 : 0, reason: reason});
    await interaction.reply({content: 'User has been successfully banned!', ephemeral: true});
    await sendLog(LogType.Interaction, `${interaction.user.tag} has executed **ban** command`, {
        target: targetMember.user.tag,
        reason: reason,
        deleteMessages: deleteMessages.toString(),
    });
}

export default {
    command: BanCmd,
    permissions: {
        roles: [adminRoleID]
    },
    function: BanFunc,
    disabled: false,
} as ICommand;