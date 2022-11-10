import { captureException } from "@sentry/node";
import { DiscordAPIError, SlashCommandBuilder } from "discord.js";
import { adminRoleID } from "../config";
import { ICommand } from "../interface";
import { LogType, sendLog } from "../utils/eventLogger";
import { APIErrors } from "../utils/StatusCodes";

export default {
    command: new SlashCommandBuilder()
    .setName('unban')
    .setDescription(`Remove a user from the ban list`)
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to unban (user ID will work).')
            .setRequired(true)
    )
    .addStringOption(opt=>
        opt.setName('reason')
            .setDescription('Reason to unban the user (Logging purposes).')
            .setRequired(false)
        
    ),
    permissions: {
        roles: [adminRoleID]
    },
    function: async(interaction)=>{
        const banList = interaction.guild?.bans;
        const targetUser = interaction.options.get('user', true).user;
        const reason = interaction.options.get('reason', false);
        if(!banList) return await interaction.reply({content: "Command must be executed in a guild", ephemeral: true}); // Command is only registered in the main guild anyway so this shouldn't be seen anyway
        if(!targetUser) return await interaction.reply({content: "Invalid User/User's ID", ephemeral: true});
        try {
            const result = await banList.remove(targetUser, reason?.value?.toString());
            await sendLog(LogType.Interaction, `${interaction.user.tag} has executed **unban** command`, {
                target: targetUser.tag,
                reason: (reason?.value?.toString()) ?? "[Not Provided]",
            });
        } catch(ex: unknown) {
            if(ex instanceof DiscordAPIError) {
                if(ex.code == APIErrors.UNKNOWN_USER) return await interaction.reply({content: "Invalid User/User's ID", ephemeral: true});
                if(ex.code == APIErrors.UNKNOWN_BAN) return await interaction.reply({content: "User does not exist in the ban list", ephemeral: true});
            }
            captureException(ex);
        }
    },
    disabled: false,
} as ICommand;