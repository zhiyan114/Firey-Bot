import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction } from 'discord.js';
import { guildID, newUserRoleID } from '../config';
import { createUserData, userDataModel, userDataType } from '../DBUtils/UserDataManager';
import {client} from '../index';
/* Command Builder */
const EvalCmd = new SlashCommandBuilder()
    .setName('eval')
    .setDescription(`Evaluates a code snippet for debugging purposes; Requires the highest privilege to run.`)
    .addStringOption(option=>
        option.setName("code")
            .setDescription("The code to evaluate.")
            .setRequired(true)
    );

/* Custom Super User Commands */

// This will add all the users that are in the server to the userData collections
const updateUserData = async ()=> {
    const dataToPush: userDataType[] = [];
    for(const [_,member] of await (client.guilds.cache.find(g=>g.id == guildID)!).members.fetch()) {
        const hasVerifyRole = member.roles.cache.find(role=>role.id == newUserRoleID);
        dataToPush.push({
            _id: member.user.id,
            username: member.user.tag,
            rulesConfirmed: hasVerifyRole ? (new Date()) : undefined
        })
    }
    await userDataModel.insertMany(dataToPush, {ordered: false});
}


/* Function Builder */
const EvalFunc = async (interaction : CommandInteraction) => {
    if (!['233955058604179457','445786517579759618'].includes(interaction.user.id)) return await interaction.reply({content: 'Access Denied!', ephemeral: true});
    const code = interaction.options.get('code',true).value as string;
    await interaction.deferReply({ ephemeral: true })
    // Setup pre-defined variables
    const channel = interaction.channel;
    const guild = interaction.guild;
    const member = interaction.member;
    const dClient = client;
    // Execute the code
    try {
        const result = eval(code);
        await interaction.followUp({content: `Execution Result: \`${result}\``, ephemeral: true});
    } catch(err) {
        await interaction.followUp({content: `Execution Error: \`${err}\``, ephemeral: true});
    }
}

export default {
    command: EvalCmd,
    function: EvalFunc,
    disabled: false,
}