// @TODO: Show global top 10 points holder.

import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction } from 'discord.js';
/* Command Builder */
const leaderboardCmd = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription(`Show the top ten points holder`)

/* Function Builder */
const leaderboardFunc = async (interaction : CommandInteraction, client : Client) => {
}

export default {
    command: leaderboardCmd,
    function: leaderboardFunc,
    disabled: true,
}