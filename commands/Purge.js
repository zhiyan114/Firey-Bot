const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

/* Command Builder */
const PurgeCmd = new SlashCommandBuilder()
    .setName('purge')
    .setDescription(`Purge messages from a channel`)
    .addNumberOption(option =>
        option.setName("amount")
            .setDescription("The amount of messages to purge. Maximum 100.")
            .setRequired(true)
    );

/* Function Builder */
const PurgeFunc = async (interaction) => {
    if (!interaction.member.roles.cache.has('908090260087513098')) return await interaction.reply({content: 'Access Denied!', ephemeral: true});
    const amount = interaction.options.getNumber('amount',true);
    if(amount <= 0 || amount > 100) return await interaction.reply({content: 'Invalid amount!', ephemeral: true});
    //const messages = await interaction.channel.messages.fetch({limit: amount});
    await interaction.deferReply({ ephemeral: true })
    await interaction.channel.bulkDelete(amount+1);
    await interaction.followUp({content: `Successfully purged ${amount} messages!`, ephemeral: true});
}

module.exports = {
    command: PurgeCmd,
    function: PurgeFunc,
    disabled: false,
}