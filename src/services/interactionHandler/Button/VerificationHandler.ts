import { prisma } from "../../../utils/DatabaseManager"
import { ButtonInteraction, GuildMember } from "discord.js";
import { sendLog, LogType } from "../../../utils/eventLogger";
import { DiscordMember } from "../../../ManagerUtils/DiscordMember";

export default async function VerificationHandler(interaction: ButtonInteraction) {
    // Rule Confirmation Button
    if(interaction.user.bot) {
        await interaction.reply({content: "PRIVILEGE INSUFFICIENT", ephemeral: true});
        return;
    };
    if(!prisma) {
        await interaction.reply({content: "The database is unavailable, please contact zhiyan114 about this.", ephemeral: true})
        return;
    }
    if(!(await new DiscordMember(interaction.member as GuildMember).verify()))
        return await interaction.reply({content: "You've already confirmed the rules.", ephemeral: true});

    // Thank the user for the confirmation
    await interaction.reply({content: "Thank you for confirming the rules.", ephemeral: true});
    await sendLog(LogType.Interaction, `${interaction.user.tag} confirmed the rules.`);
}