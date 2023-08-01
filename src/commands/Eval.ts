import { SlashCommandBuilder } from "@discordjs/builders";
import { ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, TextChannel } from "discord.js";
import { guildID, newUserRoleID } from "../config";
import { prisma } from "../utils/DatabaseManager";
import {client} from "../index";
import { ICommand } from "../interface";
import { tmiClient } from "../services/TwitchHandler";
import { withScope as sentryScope } from "@sentry/node";
import globalCmdRegister from "../globalCmdRegister";
/* Command Builder */
const EvalCmd = new SlashCommandBuilder()
  .setName("eval")
  .setDescription("Evaluates a code snippet for debugging purposes; Requires the highest privilege to run.")
  .setDMPermission(false)
  .addStringOption(option=>
    option.setName("code")
      .setDescription("The code to evaluate.")
      .setRequired(true)
  );

/* Custom Super User Commands */
type userDataType = {
    id: string,
    username: string,
    rulesconfirmedon: Date | undefined,
}

// Custom eval execution utility
const utils = {
  // Manually add all the missing users to the database
  createUserData: async ()=> {
    if(!prisma) return;
    const dataToPush: userDataType[] = [];
    const guild = client.guilds.cache.find(g=>g.id == guildID);
    if(!guild) return;
    for(const [,member] of await guild.members.fetch()) {
      if(member.user.bot) continue;
      const hasVerifyRole = member.roles.cache.find(role=>role.id == newUserRoleID);
      dataToPush.push({
        id: member.user.id,
        username: member.user.tag,
        rulesconfirmedon: hasVerifyRole ? (new Date()) : undefined
      });
    }
    await prisma.members.createMany({
      data: dataToPush,
      skipDuplicates: true,
    });
  },

  // Manually update all the out-of-date users to the database
  updateUserData: async() => {
    if(!prisma) return;
    const guild = client.guilds.cache.find(g=>g.id == guildID);
    if(!guild) return;

    for(const [,member] of await guild.members.fetch()) {
      if(member.user.bot) continue;
      await prisma.members.update({
        data: {
          username: member.user.username,
          displayname: member.user.displayName,
        },
        where: {
          id: member.user.id,
        }
      });
    }
  },

  // Manually reset the bot's status in-case it was removed from discord's backend
  updateStatus: async () => {
    client.user?.setPresence({
      status: "dnd",
      activities: [{
        name: `with ${client.guilds.cache.find(g=>g.id==guildID)?.memberCount} cuties :3`,
        type: ActivityType.Competing,
      }]
    });
  },

  // Create Verify Button
  createVerifyBtn: async (channel: TextChannel) => {
    const embed = new EmbedBuilder()
      .setTitle("Rule Verification")
      .setColor("#00FF00")
      .setDescription("Please press the **confirm** button below to confirm that you have read the rules above");
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(new ButtonBuilder()
      .setCustomId("RuleConfirm")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success)
    );
    await channel.send({embeds:[embed], components:[row]});
  },

  // Global Command Register
  globalCmdRegister,
};


/* Function Builder */
const EvalFunc = async (interaction : CommandInteraction) => {
  const code = interaction.options.get("code",true).value as string;
  await interaction.deferReply({ ephemeral: true });
    
  const channel = interaction.channel;
  // The type is any since this is dynmaically called by the client and we don't won't know the result at the end
  const print = async (msg: unknown) => {
    // Json stringify if it's an object, otherwise convert to string
    if(typeof msg == "object") msg = JSON.stringify(msg);
    if(msg === undefined || msg === null) msg = "undefined";
    else msg = msg.toString();
    await channel?.send(msg as string);
  };

  sentryScope(async (scope)=>{
    scope.setTag("isEval", true);
    try {
      // Setup pre-defined variables and code execution
      const secureFunction = new Function(
        "channel",
        "guild",
        "member",
        "dClient",
        "tClient",
        "print",
        "utils",
        code
      );

      // Execute the code
      secureFunction(
        channel,
        interaction.guild,
        interaction.member,
        client,
        tmiClient,
        print,
        utils
      );
      await interaction.followUp({content: "Execution Completed", ephemeral: true});
      //await interaction.followUp({content: `Execution Result: \`${result}\``, ephemeral: true});
    } catch(ex) {
      const err = ex as Error;
      await interaction.followUp({content: `Bad Execution [${err.name}]: \`${err.message}\``, ephemeral: true});
    }
  });
};

export default {
  command: EvalCmd,
  permissions: {
    users: ["233955058604179457","445786517579759618"]
  },
  function: EvalFunc,
  disabled: false,
} as ICommand;
