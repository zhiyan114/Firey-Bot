/* Button Creator Reference: const embed=new MessageEmbed();embed.setTitle("Rule Verification");embed.setColor("#00FF00");embed.setDescription("Please press the **confirm** button below to confirm that you have read the rules above");const row=new MessageActionRow();const btn=new MessageButton();btn.setCustomId("RuleConfirm");btn.setLabel("Confirm");btn.setStyle("SUCCESS");row.addComponents(btn);channel.send({embeds:[embed],components:[row]}); */

import { GuildMember, User } from 'discord.js';
import { userRoleManager as RoleManager } from '../utils/roleManager';
import { sendLog, LogType } from '../utils/eventLogger';
import { newUserRoleID } from '../config';
import { client } from '../index';
import { Interaction } from 'discord.js';
import { createUserData } from '../DBUtils/UserDataManager';

client.on('interactionCreate', async (interaction : Interaction) => {
    if(interaction.isButton() && interaction.customId === "RuleConfirm") {
        if(interaction.user.bot) {
            interaction.reply({content: "PRIVILEGE INSUFFICIENT", ephemeral: true});
            return;
        };
        const userRole = new RoleManager(interaction.member as GuildMember);
        if(await userRole.check(newUserRoleID)) {await interaction.reply({content: "You've already confirmed the rules.", ephemeral: true});return;};
        // Update the user's role and the database
        await userRole.add(newUserRoleID);
        await createUserData(interaction.user, new Date());
        // Thank the user for the confirmation
        await interaction.reply({content: "Thank you for confirming the rules.", ephemeral: true});
        await sendLog(LogType.Interaction, `${interaction.user.tag} confirmed the rules.`);
    }
});