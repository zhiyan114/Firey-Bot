// @TODO: Show global top 10 points holder.

import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction, EmbedBuilder } from 'discord.js';
import Mongoose from 'mongoose';
import { econSchema, econType } from '../services/EconomyHandler';
import { isConnected } from '../utils/DatabaseManager';
/* Command Builder */
const leaderboardCmd = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription(`Show the top ten points holder`)

/* Function Builder */
const leaderboardFunc = async (interaction : CommandInteraction, client : Client) => {
    const isEphmeral = interaction.options.get('ephemeral', false)?.value as boolean ?? true;
    if(!isConnected()) return await interaction.reply({content: "Unfortunately the database is not connected, please report this issue.", ephemeral: true});
    await interaction.deferReply();
    const econModel = Mongoose.model<econType>("economy",econSchema);
    const topTenEconData = await econModel.find({}).sort({points: -1}).limit(10);
    let FormattedBoard = "";
    // Format all the data into a proper markup to display
    for(let EconData of topTenEconData) {
        FormattedBoard += `\`${EconData.username}\` - **${EconData.points}**\n\n`
    }
    // Remove the last 2 newline (or do nothing if there is nothing to show)
    if(FormattedBoard.length >= 2) FormattedBoard = FormattedBoard.substring(0,FormattedBoard.length-2);
    const embed = new EmbedBuilder();
    embed.setTitle(`Global Leaderboard`);
    embed.setColor("#00FFFF");
    embed.setDescription(FormattedBoard);
    embed.setTimestamp();
    await interaction.followUp({embeds:[embed], ephemeral: false});
}

export default {
    command: leaderboardCmd,
    function: leaderboardFunc,
    disabled: false,
}