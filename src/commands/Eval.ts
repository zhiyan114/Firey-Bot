import { SlashCommandBuilder } from "@discordjs/builders";
import { ActivityType, CommandInteraction } from "discord.js";
import { guildID, newUserRoleID } from "../config";
import { prisma } from "../utils/DatabaseManager";
import {client} from "../index";
import { ICommand } from "../interface";
import { tmiClient } from "../services/TwitchHandler";
import { withScope as sentryScope } from "@sentry/node";
import { members, Prisma } from "@prisma/client";
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

// Manually add all the missing users to the database
const createUserData = async ()=> {
  if(!prisma) return;
  const dataToPush: userDataType[] = [];
  for(const [_,member] of await (client.guilds.cache.find(g=>g.id == guildID)!).members.fetch()) {
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
};
// Manually update all the out-of-date users to the database
const updateUserData = async() => {
  if(!prisma) return;
  const allwait: Promise<members | undefined>[] = [];
  for(const [_,member] of await (client.guilds.cache.find(g=>g.id == guildID)!).members.fetch()) {
    if(member.user.bot) continue;
    allwait.push((async()=>{
      try {
        const newUsername = member.user.discriminator === "0" ? member.user.username : member.user.tag;
        return await prisma.members.update({
          data: {
            username: newUsername,
          },
          where: {
            id: member.id,
            NOT: {
              username: newUsername,
            }
          }
        });
      } catch(ex){
        if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code == "P2025") return;
        throw ex;
      }
    })());
  }
  await Promise.all(allwait);
};

// Manually reset the bot's status in-case it was removed from discord's backend
const updateStatus = async () => {
    client.user!.setPresence({
      status: "dnd",
      activities: [{
        name: `with ${client.guilds.cache.find(g=>g.id==guildID)?.memberCount} cuties :3`,
        type: ActivityType.Competing,
      }]
    });
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
        "createUserData",
        "updateUserData",
        "updateStatus",
        "globalCmdRegister",
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
        createUserData,
        updateUserData,
        updateStatus,
        globalCmdRegister
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
