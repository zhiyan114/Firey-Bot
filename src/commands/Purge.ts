/* Command Builder */
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, BaseGuildTextChannel, TextChannel } from 'discord.js';
import { adminRoleID, logChannelID }  from '../config';
import { ICommand } from '../interface';
import { DiscordUser } from '../ManagerUtils/DiscordUser';
const PurgeCmd = new SlashCommandBuilder()
    .setName('purge')
    .setDescription(`Purge messages from a channel`)
    .setDMPermission(false)
    .addNumberOption(option =>
        option.setName("amount")
            .setDescription("The amount of messages to purge. Maximum 100.")
            .setRequired(true)
    )
    .addStringOption(opt=>
        opt.setName("reason")
        .setDescription("The reason for the purge")
        .setRequired(false)
    );


/* Function Builder */
const PurgeFunc = async (interaction : CommandInteraction) => {
    if(!interaction.channel) return await interaction.reply("Interaction must be executed in a server")
    const amount = interaction.options.get('amount',true).value as number;
    const reason = interaction.options.get('reason', false)?.value as string | undefined;
    if(amount <= 0 || amount > 100) return await interaction.reply({content: 'Invalid amount!', ephemeral: true});
    //const messages = await interaction.channel.messages.fetch({limit: amount});
    await interaction.deferReply({ ephemeral: true })
    await (interaction.channel as BaseGuildTextChannel).bulkDelete(amount);
    await interaction.followUp({content: `Successfully purged ${amount} messages!`, ephemeral: true});
    // Do not log zhiyan114 when he purges log channel as it's to keep it clean during maintenance
    if(interaction.channel.id === logChannelID && interaction.user.id === "233955058604179457") return;
    const User = new DiscordUser(interaction.user)
    await User.actionLog({
        actionName: "purge",
        message: `<@${interaction.user.id}> has executed **purge** command`,
        reason,
        metadata: {
            channel: `<#${(interaction.channel as TextChannel).id}>`,
            amount: amount.toString()
        }
    });
}

export default {
    command: PurgeCmd,
    permissions: {
        roles: [adminRoleID]
    },
    function: PurgeFunc,
    disabled: false,
} as ICommand;