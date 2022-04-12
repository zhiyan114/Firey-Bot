const { SlashCommandBuilder } = require('@discordjs/builders');

/* Command Builder */
const EvalCmd = new SlashCommandBuilder()
    .setName('eval')
    .setDescription(`Evaluates a code snippet for debugging purposes; Requires the highest privilege (ROOT) to run.`)
    .addStringOption(option=>
        option.setName("code")
            .setDescription("The code to evaluate.")
            .setRequired(true)
    );

/* Function Builder */
const EvalFunc = async (interaction) => {
    if (!interaction.member.roles.cache.has('940387144751538197')) return await interaction.reply({content: 'Access Denied!', ephemeral: true});
    const code = interaction.options.data.find(option => option.type == "STRING").value;
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
        await interaction.followUp({content: `Execution Error: ${err}`, ephemeral: true});
    }
}

module.exports = {
    command: EvalCmd,
    function: EvalFunc,
    disabled: false,
}