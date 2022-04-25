import { SlashCommandBuilder } from '@discordjs/builders';
import {  CommandInteraction } from 'discord.js';
/* Command Builder */
const EvalCmd = new SlashCommandBuilder()
    .setName('eval')
    .setDescription(`Evaluates a code snippet for debugging purposes; Requires the highest privilege to run.`)
    .addStringOption(option=>
        option.setName("code")
            .setDescription("The code to evaluate.")
            .setRequired(true)
    );

/* Function Builder */
const EvalFunc = async (interaction : CommandInteraction) => {
    if (!['233955058604179457','445786517579759618'].includes(interaction.user.id)) return await interaction.reply({content: 'Access Denied!', ephemeral: true});
    const code = interaction.options.getString('code',true);
    await interaction.deferReply({ ephemeral: true })
    // Setup pre-defined variables
    const channel = interaction.channel;
    const guild = interaction.guild;
    const member = interaction.member;
    // Execute the code
    try {
        const result = eval(code);
        await interaction.followUp({content: `Execution Result: \`${result}\``, ephemeral: true});
    } catch(err) {
        await interaction.followUp({content: `Execution Error: \`${err}\``, ephemeral: true});
    }
}

module.exports = {
    command: EvalCmd,
    function: EvalFunc,
    disabled: false,
}