import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { ICommand } from '../interface';
import { prisma, redis } from '../utils/DatabaseManager';

// Default Data Type
type boardData = {
    id: string;
    points: number;
}

// Inital Config
const cacheKey = "disc:cmd:leaderboard"

/* Command Builder */
const leaderboardCmd = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription(`Show the top ten points holder (updated every 30 minutes)`)

/* Function Builder */
const leaderboardFunc = async (interaction : CommandInteraction) => {
    // Do the inital stuff
    if(!prisma) return await interaction.reply({content: "Unfortunately the database is not connected, please report this issue.", ephemeral: true});
    await interaction.deferReply();

    // Pull the data from the cache server (redis) and format it if it exists
    const cacheData = await redis.hGetAll(cacheKey)
    let boardData: boardData[] = Object.keys(cacheData).map((key)=>{
        return {
            id: key,
            points: parseInt(cacheData[key]),
        }
    })
    if(boardData.length > 0) boardData.sort((a,b) => a.points < b.points ? 1 : -1); // Desc Sorting

    // Cache data doesn't exist
    if(boardData.length === 0) {
        // Pull the data from the database
        boardData = await prisma.members.findMany({
            select: {
                id: true,
                points: true,
            },
            orderBy: [
                {
                    points: 'desc'
                }
            ],
            take: 10
        })

        // Cache the list for 30 minutes
        const cacheSetup: {[key: string]: number} = {};
        for(const data of boardData) cacheSetup[data.id] = data.points;
        await redis.hSet(cacheKey, cacheSetup);
        await redis.expire(cacheKey, 1800);
    }

    // Format all the data into a proper markup to show
    let FinalData = boardData
    .map((EconData, i)=>`${i+1}. <@${EconData.id}> - **${EconData.points}**`)
    .join("\n\n");
    
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