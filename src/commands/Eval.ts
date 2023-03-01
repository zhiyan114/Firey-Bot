import { SlashCommandBuilder } from '@discordjs/builders';
import { ActivityType, CommandInteraction } from 'discord.js';
import { guildID, newUserRoleID } from '../config';
import { prisma } from '../utils/DatabaseManager';
import {client} from '../index';
import { ICommand } from '../interface';
import { tmiClient } from '../services/TwitchHandler';
import { withScope as sentryScope } from '@sentry/node';
import { members, Prisma } from '@prisma/client';
/* Command Builder */
const EvalCmd = new SlashCommandBuilder()
    .setName('eval')
    .setDescription(`Evaluates a code snippet for debugging purposes; Requires the highest privilege to run.`)
    .addStringOption(option=>
        option.setName("code")
            .setDescription("The code to evaluate.")
            .setRequired(true)
    );

/* Custom Super User Commands */
type userDataType = {
    id: string,
    tag: string,
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
            tag: member.user.tag,
            rulesconfirmedon: hasVerifyRole ? (new Date()) : undefined
        })
    }
    await prisma.members.createMany({
        data: dataToPush,
        skipDuplicates: true,
    });
}
// Manually update all the out-of-date users to the database
const updateUserData = async() => {
    if(!prisma) return;
    const allwait: Promise<members | undefined>[] = [];
    for(const [_,member] of await (client.guilds.cache.find(g=>g.id == guildID)!).members.fetch()) {
        if(member.user.bot) continue;
        allwait.push((async()=>{
            try {
                return prisma.members.update({
                    data: {
                        tag: member.user.tag,
                    },
                    where: {
                        id: member.id,
                        NOT: {
                            tag: member.user.tag,
                        }
                    }
                })
            } catch(ex){
                if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code == "P2025") return;
                throw ex;
            }
        })());
    }
    await Promise.all(allwait);
}

// Manually reset the bot's status in-case it was removed from discord's backend
const updateStatus = async () => {
    client.user!.setPresence({
        status: "dnd",
        activities: [{
            name: `with ${client.guilds.cache.find(g=>g.id==guildID)?.memberCount} cuties :3`,
            type: ActivityType.Competing,
        }]
    })
}


/* Function Builder */
const EvalFunc = async (interaction : CommandInteraction) => {
    sentryScope(async (scope)=>{
        scope.setTag("isEval", true);
        const code = interaction.options.get('code',true).value as string;
        await interaction.deferReply({ ephemeral: true })
        // Setup pre-defined variables
        const channel = interaction.channel;
        const guild = interaction.guild;
        const member = interaction.member;
        const dClient = client;
        const tClient = tmiClient;
        const secureCode = `
        try {
            ${code}
        } catch(ex) {
            channel.send({content: "ERROR: ["+ex.name+"]: "+ex.message})
        }`;
        try {
            // Execute the code
            const result = eval(secureCode);
            await interaction.followUp({content: `Execution Result: \`${result}\``, ephemeral: true});
        } catch(ex) {
            const err = ex as Error;
            await interaction.followUp({content: `Bad Execution [${err.name}]: \`${err.message}\``, ephemeral: true});
        }
    })
}

export default {
    command: EvalCmd,
    permissions: {
        users: ["233955058604179457","445786517579759618"]
    },
    function: EvalFunc,
    disabled: false,
} as ICommand;