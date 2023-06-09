import { captureException } from "@sentry/node";
import { DiscordAPIError, SlashCommandBuilder } from "discord.js";
import { adminRoleID } from "../config";
import { ICommand } from "../interface";
import { APIErrors } from "../utils/discordErrorCode";
import { DiscordUser } from "../ManagerUtils/DiscordUser";

export default {
    command: new SlashCommandBuilder()
    .setName('unban')
    .setDescription(`Remove a user from the ban list`)
    .setDMPermission(false)
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
        // Get all the option data
        const banList = interaction.guild?.bans;
        const target = interaction.options.get('user', true).user;
        const reason = interaction.options.get('reason', false);

        // Sanity Check the data
        if(!banList) return await interaction.reply({content: "Command must be executed in a guild", ephemeral: true}); // Command is only registered in the main guild anyway so this shouldn't be seen anyway
        if(!target) return await interaction.reply({content: "Invalid User/User's ID", ephemeral: true});
        await interaction.deferReply({ephemeral: true});

        // Post-Check data
        const targetUser = new DiscordUser(target);
        const issuerUser = new DiscordUser(interaction.user)
        try {
            // Take action
            await interaction.guild?.bans.remove(target, reason?.value?.toString());

            // Log and cleanup
            await issuerUser.actionLog({
                actionName: "unban",
                target: targetUser,
                message: `<@${target.id}> has been unbanned by <@${interaction.user.id}>`,
                reason: reason?.value?.toString()
            });
            await interaction.followUp({content: "Successfully unbanned the user", ephemeral: true})
        } catch(ex: unknown) {
            if(ex instanceof DiscordAPIError) {
                if(ex.code === APIErrors.UNKNOWN_USER) return await interaction.followUp({content: "Invalid User/User's ID", ephemeral: true});
                if(ex.code === APIErrors.UNKNOWN_BAN) return await interaction.followUp({content: "User does not exist in the ban list", ephemeral: true});
            }
            captureException(ex);
        }
    },
    disabled: false,
} as ICommand;