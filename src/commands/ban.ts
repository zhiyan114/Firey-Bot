import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember } from 'discord.js';
import { adminRoleID }  from '../config';
import { ICommand } from '../interface';
import { DiscordUser } from '../ManagerUtils/DiscordUser';

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
    const targetMember = interaction.options.getMember('user') as GuildMember | undefined;
    if(!targetMember) return await interaction.reply("Invalid User has been supplied");
    const reason = interaction.options.get('reason',true).value as string;
    const deleteMessages = interaction.options.get('delete',true).value as boolean;
    const targetUser = new DiscordUser(targetMember.user);
    await interaction.deferReply({ephemeral: true});
    await targetUser.sendMessage({
        title: "Banned",
        color: "#ff0000",
        message: `You have been banned from ${interaction.guild!.name}!`,
        fields: [
            {
                name: "Reason",
                value: reason
            },
            {
                name: "Banned By",
                value: interaction.user.tag
            }
        ]
    })
    await targetMember.ban({
        reason,
        deleteMessageSeconds: deleteMessages ? 604800 : undefined
    });
    await targetUser.actionLog("ban", new DiscordUser(interaction.user), `<@${targetMember.id}> has been banned by <@${interaction.user.id}>`, reason)
    await interaction.followUp({content: 'User has been successfully banned!', ephemeral: true});
}

export default {
    command: BanCmd,
    permissions: {
        roles: [adminRoleID]
    },
    function: BanFunc,
    disabled: false,
} as ICommand;