import { SlashCommandBuilder } from "discord.js";
import { ICommand } from "../interface";
import { enableExtra } from '../config';
import {} from "@sentry/node";

export default {
  command: new SlashCommandBuilder()
    .setName('reportbug')
    .setDMPermission(false)
    .setDescription(`Report any bugs that are happening to the bot`),
  function: async (command)=>{
        return;
  },
  disabled: process.env["SENTRY_DSN"] && enableExtra.userReport,
} as ICommand;