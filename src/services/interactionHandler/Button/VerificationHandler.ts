import { prisma } from "../../../utils/DatabaseManager"
import { ButtonInteraction, GuildMember } from "discord.js";
import { userRoleManager as RoleManager } from '../../../utils/roleManager';
import { newUserRoleID } from "../../../config";
import { updateUserData, createUserData } from "../../../DBUtils/UserDataManager";
import { sendLog, LogType } from "../../../utils/eventLogger";

export default async function VerificationHandler(interaction: ButtonInteraction) {
    // Rule Confirmation Button
    if(interaction.user.bot) {
        interaction.reply({content: "PRIVILEGE INSUFFICIENT", ephemeral: true});
        return;
    };
    if(!prisma) {
        await interaction.reply({content: "The database is unavailable, please contact zhiyan114 about this.", ephemeral: true})
        return;
    }
    const userRole = new RoleManager(interaction.member as GuildMember);
    if(await userRole.check(newUserRoleID)) {
        await interaction.reply({content: "You've already confirmed the rules.", ephemeral: true});
        return;
    };
    // Update the user's role and the database
    await userRole.add(newUserRoleID);
    // Update the database or add new user if it haven't been created yet
    const updatedUser = await updateUserData(interaction.user, {rulesconfirmedon: new Date()});
    if(!updatedUser) return await createUserData(interaction.user, new Date());
    // Thank the user for the confirmation
    await interaction.reply({content: "Thank you for confirming the rules.", ephemeral: true});
    await sendLog(LogType.Interaction, `${interaction.user.tag} confirmed the rules.`);
}