/* Command Builder */
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, BaseGuildTextChannel, GuildMember, TextChannel } from 'discord.js';
import { userRoleManager } from '../utils/roleManager';
import { sendLog, LogType } from '../utils/eventLogger';
import { adminRoleID, logChannelID }  from '../../config.json';
const PurgeCmd = new SlashCommandBuilder()
    .setName('purge')
    .setDescription(`Purge messages from a channel`)
    .addNumberOption(option =>
        option.setName("amount")
            .setDescription("The amount of messages to purge. Maximum 100.")
            .setRequired(true)
    );

/* Function Builder */
const PurgeFunc = async (interaction : CommandInteraction) => {
    if (!(new userRoleManager(interaction.member as GuildMember)).check(adminRoleID)) return await interaction.reply({content: 'Access Denied!', ephemeral: true});
    const amount = interaction.options.getNumber('amount',true);
    if(amount <= 0 || amount > 100) return await interaction.reply({content: 'Invalid amount!', ephemeral: true});
    //const messages = await interaction.channel.messages.fetch({limit: amount});
    await interaction.deferReply({ ephemeral: true })
    await (interaction.channel as BaseGuildTextChannel).bulkDelete(amount+1);
    await interaction.followUp({content: `Successfully purged ${amount} messages!`, ephemeral: true});
    if(interaction.channel.id !== logChannelID) await sendLog(LogType.Interaction, `${interaction.user.tag} has executed **purge** command`, {
        channelName: (interaction.channel as TextChannel).name,
        amount: amount.toString()
    });
}

export default {
    command: PurgeCmd,
    function: PurgeFunc,
    disabled: false,
}