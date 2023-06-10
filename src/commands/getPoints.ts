// @TODO: Show individual's balance privately?

import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { ICommand } from '../interface';
import { DiscordUser } from '../ManagerUtils/DiscordUser';
import { prisma } from '../utils/DatabaseManager';

/* Command Builder */
const GetPointsCmd = new SlashCommandBuilder()
    .setName('getpoints')
    .setDescription(`Show your total points publically or privately`)

/* Function Builder */
const GetPointsFunc = async (interaction : CommandInteraction) => {
    // Do the usual command init
    if(!prisma) return await interaction.reply({content: "Unfortunately the database is not connected, please report this issue.", ephemeral: true});
    await interaction.deferReply({ephemeral: true});

    // Setup the embed and send it
    const userData = await new DiscordUser(interaction.user).getCacheData();
    const embed = new EmbedBuilder();
    embed.setTitle(`Your Points`);
    embed.setColor("#00FFFF");
    embed.setDescription(userData?.points?.toString() ?? "0 (chat to get your first points)");
    embed.setAuthor({name: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? interaction.user.defaultAvatarURL});
    embed.setTimestamp();
    await interaction.followUp({embeds:[embed], ephemeral: true});
}

export default {
    command: GetPointsCmd,
    function: GetPointsFunc,
    disabled: false,
} as ICommand;