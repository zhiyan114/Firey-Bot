// @TODO: Show individual's balance privately?

import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction, EmbedBuilder } from 'discord.js';
import Mongoose from 'mongoose';
import { econSchema, econType } from '../services/EconomyHandler';
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
const GetPointsFunc = async (interaction : CommandInteraction, client : Client) => {
    const isEphmeral = interaction.options.get('ephemeral', false)?.value as boolean ?? true;
    if(!isConnected()) return await interaction.reply({content: "Unfortunately the database is not connected, please report this issue.", ephemeral: true});
    await interaction.deferReply();
    const econModel = Mongoose.model<econType>("economy",econSchema);
    const userEconData = await econModel.findOne({_id: interaction.user.id});
    const embed = new EmbedBuilder();
    embed.setTitle(`Your Points`);
    embed.setAuthor({name: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? interaction.user.defaultAvatarURL});
    embed.setTimestamp();
    await interaction.followUp({embeds:[embed], ephemeral: isEphmeral});
}

export default {
    command: GetPointsCmd,
    function: GetPointsFunc,
    disabled: false,
}