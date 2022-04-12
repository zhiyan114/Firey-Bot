const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

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
const BanFunc = async (interaction) => {
    if (!interaction.member.roles.cache.has('908090260087513098')) return await interaction.reply({content: 'Access Denied!', ephemeral: true});
    const targetMember = interaction.options.getMember('user',true);
    const reason = interaction.options.getString('reason',true);
    const deleteMessages = interaction.options.getBoolean('delete',true);
    const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setTitle('Banned')
        .setDescription(`You have been banned from ${interaction.guild.name}!`)
        .addField('Reason', reason)
        .setFooter({text: `Banned by ${interaction.user.username}#${interaction.user.discriminator}`})
        .setTimestamp();
    await targetMember.send({embeds:[embed]});
    await targetMember.ban({days: deleteMessages ? 7 : 0, reason: reason});
    await interaction.reply({content: 'User has been successfully banned!', ephemeral: true});
}

module.exports = {
    command: BanCmd,
    function: BanFunc,
    disabled: false,
}