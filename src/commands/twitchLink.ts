import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '../utils/DatabaseManager';
import { ICommand } from '../interface';

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
    if(!prisma) return;
    const twitchUsername = interaction.options.get('username',true).value as string;
    await interaction.deferReply({ephemeral: true});
    const embed = new EmbedBuilder()
        .setTitle('Link Twitch Account')
        .setFooter({text: `Twitch Linking System`})
        .setTimestamp();
    // Check if user already has a verified twitch link
    const userTData = await prisma.twitch.findUnique({
        where: {
            memberid: interaction.user.id
        }
    })
    if(userTData && userTData.verified) {
        embed.setColor('#ff0000')
        .setDescription("You've already linked your twitch account. To change it, please contact the bot operator.");
        return await interaction.followUp({embeds:[embed],ephemeral: true})
    }
    // Check if the twitch account has already been linked on someone's account (prevent multi-account)
    const userExist = await prisma.twitch.findFirst({
        where: {
            username: twitchUsername,
            verified: true,
        }
    })
    if(userExist) {
        embed.setColor('#ff0000')
        .setDescription("This twitch account has already been linked, if you believe this is a mistake, please contact the bot operator.");
        return await interaction.followUp({embeds:[embed], ephemeral: true});
    }
    await prisma.twitch.update({
        data: {
            username: twitchUsername,
            verified: false,
        },
        where: {
            memberid: interaction.user.id
        }
    });
    embed.setColor("#00FFFF")
    .setDescription(`Thank you for linking your twitch account! To complete this process, please visit Firey's twitch channel (https://www.twitch.tv/fireythealiendragon) and type: \`!verify ${interaction.user.id}\` to the chat. Please note that once you verify, you will not be able to change it again unless you contact the bot operator.`);
    await interaction.followUp({embeds:[embed], ephemeral: true});
}

export default {
    command: twitchLinkCmd,
    function: twitchLinkFunc,
    disabled: false,
} as ICommand;