import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, Permissions } from 'discord.js';
import { adminRoleID }  from '../../config.json';
import { userRoleManager, roleManager } from '../utils/roleManager';
/* Command Builder */
const LockdownCmd = new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription(`Lockdown the chat channels for unprivileged users. *Emergency Use Only*`)
    .addBooleanOption(option=>
        option.setName("Enabled")
            .setDescription("To enable or disable the lockdown mode.")
            .setRequired(true)
    );

/* Function Builder */
const LockdownFunc = async (interaction : CommandInteraction) => {
    if (!(new userRoleManager(interaction.member as GuildMember)).check(adminRoleID)) return await interaction.reply({content: 'Access Denied!', ephemeral: true}); // Permission Check
    const userRole = new roleManager(interaction.guild.roles.cache.find(r => r.id === "907768073442983966"));
    const optEnabled = interaction.options.getBoolean('Enabled',true);
    const isEnabled = userRole.checkPermission(Permissions.FLAGS.SEND_MESSAGES);

    if(optEnabled && isEnabled) return await interaction.reply({content: 'Lockdown mode is already enabled!', ephemeral: true});
    if(!optEnabled && !isEnabled) return await interaction.reply({content: 'Lockdown mode is already disabled!', ephemeral: true});
    if(!optEnabled) await userRole.addPermission(Permissions.FLAGS.SEND_MESSAGES, "Lockdown mode disabled");
    else await userRole.removePermission(Permissions.FLAGS.SEND_MESSAGES, "Lockdown mode enabled");
    await interaction.reply({content: optEnabled ? "Lockdown has been successfully enabled" : "Lockdown has been successfully disabled", ephemeral: false});
}

export default {
    command: LockdownCmd,
    function: LockdownFunc,
    disabled: false,
}