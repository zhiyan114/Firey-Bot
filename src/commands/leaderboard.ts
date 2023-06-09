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
    // Do the inital stuff
    if(!prisma) return await interaction.reply({content: "Unfortunately the database is not connected, please report this issue.", ephemeral: true});
    await interaction.deferReply();

    // Pull all the data from the database (@TODO: Cache this data via redis and change the description to reflect that)
    const topTenEconData = await prisma.members.findMany({
        orderBy: [
            {
                points: 'desc'
            }
        ],
        take: 10
    })

    // Format all the data into a proper markup to show
    let FinalData = topTenEconData
    .map((EconData, i)=>`${i+1}. <@${EconData.id}> - **${EconData.points}**`)
    .join("\n\n");
    if(FinalData.length >= 2) FinalData = FinalData.substring(0,FinalData.length-2);
    
    // Setup the embed and send it to the user
    const embed = new EmbedBuilder();
    embed.setTitle(`Global Leaderboard`);
    embed.setColor("#00FFFF");
    embed.setDescription(FinalData);
    embed.setTimestamp();
    await interaction.followUp({embeds:[embed], ephemeral: false});
}

export default {
    command: leaderboardCmd,
    function: leaderboardFunc,
    disabled: false,
} as ICommand;