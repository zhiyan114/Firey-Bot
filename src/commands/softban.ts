import { SlashCommandBuilder } from "discord.js";
import { adminRoleID } from "../config";
import { ICommand } from "../interface";

export default {
    command: new SlashCommandBuilder()
    .setName('softban')
    .setDescription(`Kicks the user but also deletes their messgae.`),
    permissions: {
        roles: [adminRoleID]
    },
    function: (command)=>{
        
    },
    disabled: false,
} as ICommand;