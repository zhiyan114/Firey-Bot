// @TODO: Show individual's balance privately?

import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction } from 'discord.js';
/* Command Builder */
const GetPointsCmd = new SlashCommandBuilder()
    .setName('getPoints')
    .setDescription(`Show your points privately`)

/* Function Builder */
const GetPointsFunc = async (interaction : CommandInteraction, client : Client) => {
}

export default {
    command: GetPointsCmd,
    function: GetPointsFunc,
    disabled: true,
}