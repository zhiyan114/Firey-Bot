// @TODO: Show global top 10 points holder.

import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { ICommand } from '../interface';
import { prisma } from '../utils/DatabaseManager';
/* Command Builder */
const leaderboardCmd = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription(`Show the top ten points holder`)

/* Function Builder */
const leaderboardFunc = async (interaction : CommandInteraction) => {
    if(!prisma) return await interaction.reply({content: "Unfortunately the database is not connected, please report this issue.", ephemeral: true});
    await interaction.deferReply();
    const topTenEconData = await prisma.members.findMany({
        orderBy: [
            {
                points: 'desc'
            }
        ],
        take: 10
    })
    let FormattedBoard = "";
    // Format all the data into a proper markup to display
    let dataCount  = 0;
    for(const EconData of topTenEconData) {
        dataCount += 1;
        FormattedBoard += `${dataCount}. \`<@${EconData.id}\`> - **${EconData.points}**\n\n`
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
} as ICommand;