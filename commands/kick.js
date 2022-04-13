const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

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
const KickFunc = async (interaction) => {
    if (!interaction.member.roles.cache.has('908090260087513098')) return await interaction.reply({content: 'Access Denied!', ephemeral: true});
    const targetMember = interaction.options.getMember('user',true);
    const reason = interaction.options.getString('reason',true);
    const invite = interaction.options.getBoolean('invite',true);
    const embed = new MessageEmbed()
        .setColor('#FFFF00')
        .setTitle('Kicked')
        .setDescription(`You have been kicked from ${interaction.guild.name}!`)
        .addField('Reason', reason)
        .setFooter({text: `Kicked by ${interaction.user.username}#${interaction.user.discriminator}`})
        .setTimestamp();
    if(invite) {
        embed.setDescription(`${embed.description} A re-invite link has been attached to this message (expires in 1 week).`);
        const inviteLink = await interaction.guild.channels.cache.find(channel => channel.id == "907311644076564511").createInvite({maxAge: 604800, maxUses: 1, reason: "Moderator attached invitation link for this kick action"});
        embed.addField('Invite Link', inviteLink.url);
    }
    await targetMember.send({embeds:[embed]});
    await targetMember.kick(reason);
    await interaction.reply({content: 'User has been successfully kicked!', ephemeral: true});
}

module.exports = {
    command: KickCmd,
    function: KickFunc,
    disabled: false,
}