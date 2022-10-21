import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { userDataModel } from '../DBUtils/UserDataManager';

/* Command Builder */
const twitchLinkCmd = new SlashCommandBuilder()
    .setName('twitchlink')
    .setDescription(`Link your twitch.`)
    .addStringOption(option=>
        option.setName("username")
            .setDescription("Your twitch username")
            .setRequired(true)
    )

/* Function Builder */
const twitchLinkFunc = async (interaction : CommandInteraction) => {
    const twitchUsername = interaction.options.get('username',true).value as string;
    await interaction.deferReply({ephemeral: true});
    const embed = new EmbedBuilder()
        .setTitle('Link Twitch Account')
        .setFooter({text: `Twitch Linking System`})
        .setTimestamp();
    // Check if user already has a verified twitch link
    const userData = await userDataModel.findOne({_id: interaction.user.id})
    if(userData?.twitch?.verified) {
        embed.setColor('#ff0000')
        .setDescription("You've already linked your twitch account. To change it, please contact the bot operator.");
        return await interaction.followUp({embeds:[embed],ephemeral: true})
    }
    // Check if the twitch account has already been linked on someone's account (prevent multi-account)
    const userExist = await userDataModel.findOne({
        "twitch.username": twitchUsername,
        "twitch.verified": true,
    })
    if(userExist) {
        embed.setColor('#ff0000')
        .setDescription("This twitch account has already been linked, if you believe this is a mistake, please contact the bot operator.");
        return await interaction.followUp({embeds:[embed], ephemeral: true});
    }
    await userDataModel.updateOne({_id: interaction.user.id}, {$set: {
        "twitch.username": twitchUsername,
        "twitch.verified": false,
    }})
    embed.setColor("#00FFFF")
    .setDescription(`Thank you for linking your twitch account! To complete this process, please visit Firey's twitch channel (https://www.twitch.tv/fireythealiendragon) and type: \`!verify ${interaction.user.id}\` to the chat. Please note that once you verify, you will not be able to change it again unless you contact the bot operator.`);
    await interaction.followUp({embeds:[embed], ephemeral: true});
}

export default {
    command: twitchLinkCmd,
    function: twitchLinkFunc,
    disabled: false,
};