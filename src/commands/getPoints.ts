// @TODO: Show individual's balance privately?

import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction, EmbedBuilder } from 'discord.js';
import { econModel } from '../DBUtils/EconomyManger';
import { isConnected } from '../utils/DatabaseManager';

/* Command Builder */
const GetPointsCmd = new SlashCommandBuilder()
    .setName('getpoints')
    .setDescription(`Show your total points publically or privately`)
    .addBooleanOption(opt=>
        opt.setName("ephemeral")
            .setDescription("Whether to show your points privately. Default is true.")
            .setRequired(false)
    )

/* Function Builder */
const GetPointsFunc = async (interaction : CommandInteraction) => {
    const isEphmeral = interaction.options.get('ephemeral', false)?.value as boolean ?? true;
    if(!isConnected()) return await interaction.reply({content: "Unfortunately the database is not connected, please report this issue.", ephemeral: true});
    await interaction.deferReply({ephemeral: isEphmeral});
    const userEconData = await econModel.findOne({_id: interaction.user.id});
    const embed = new EmbedBuilder();
    embed.setTitle(`Your Points`);
    embed.setColor("#00FFFF");
    embed.setDescription(userEconData?.points.toString() ?? "[ERROR]: Your record is not found, please report this issue.");
    embed.setAuthor({name: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? interaction.user.defaultAvatarURL});
    embed.setTimestamp();
    await interaction.followUp({embeds:[embed], ephemeral: isEphmeral});
}

export default {
    command: GetPointsCmd,
    function: GetPointsFunc,
    disabled: false,
}