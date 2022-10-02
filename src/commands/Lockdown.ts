import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { userRoleManager, roleManager } from '../utils/roleManager';
import { sendLog, LogType } from '../utils/eventLogger';
import { adminRoleID, newUserRoleID }  from '../config';
/* Command Builder */
const LockdownCmd = new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription(`Lockdown the chat channels for unprivileged users. *Emergency Use Only*`)
    .addBooleanOption(option=>
        option.setName("enabled")
            .setDescription("To enable or disable the lockdown mode.")
            .setRequired(true)
    );

/* Function Builder */
const LockdownFunc = async (interaction : CommandInteraction) => {
    if (!(new userRoleManager(interaction.member as GuildMember)).check(adminRoleID)) return await interaction.reply({content: 'Access Denied!', ephemeral: true}); // Permission Check
    const userRole = new roleManager(interaction.guild!.roles.cache.find(r => r.id === newUserRoleID)!);
    const optEnabled = interaction.options.get('Enabled',true).value as boolean;
    const isEnabled = await userRole.checkPermission(PermissionFlagsBits.SendMessages);

    if(optEnabled && isEnabled) return await interaction.reply({content: 'Lockdown mode is already enabled!', ephemeral: true});
    if(!optEnabled && !isEnabled) return await interaction.reply({content: 'Lockdown mode is already disabled!', ephemeral: true});
    if(!optEnabled) await userRole.addPermission(PermissionFlagsBits.SendMessages, "Lockdown mode disabled");
    else await userRole.removePermission(PermissionFlagsBits.SendMessages, "Lockdown mode enabled");
    await interaction.reply({content: optEnabled ? "Lockdown has been successfully enabled" : "Lockdown has been successfully disabled", ephemeral: false});
    await sendLog(LogType.Interaction, `${interaction.user.tag} has executed **lockdown** command`, {
        enabled: optEnabled.toString(),
    });
}

export default {
    command: LockdownCmd,
    function: LockdownFunc,
    disabled: false,
}