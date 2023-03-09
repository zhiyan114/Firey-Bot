import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { ICommand } from "../interface";
import { prisma, redis } from "../utils/DatabaseManager";

function dbDescription(createQ?: number, selectQ?: number, updateQ?: number, deleteQ?: number) {
    return `
    Create Query: ${createQ ? createQ+"ms" : ":arrows_counterclockwise:"}
    Select Query: ${selectQ ? selectQ+"ms" : ":arrows_counterclockwise:"}
    Update Query: ${updateQ ? updateQ+"ms" : ":arrows_counterclockwise:"}
    Delete Query: ${deleteQ ? deleteQ+"ms" : ":arrows_counterclockwise:"}
    Total Roundtrip: ${createQ && selectQ && updateQ && deleteQ ? (createQ+selectQ+updateQ+deleteQ).toString()+"ms" : ":arrows_counterclockwise:"}
    `
}
function redisDesc(createK?: number, readK?: number, deleteK?: number) {
    return `
    Create Key: ${createK ? createK+"ms" : ":arrows_counterclockwise:"}
    Read Key: ${readK ? readK+"ms" : ":arrows_counterclockwise:"}
    Delete Key: ${deleteK ? deleteK+"ms" : ":arrows_counterclockwise:"}
    `
}

export default {
    command: new SlashCommandBuilder()
    .setName('test')
    .setDescription(`Bot's Service Testing Utility`)
    .addIntegerOption(opt=>
        opt.setName("service")
            .setDescription("Select the service to test")
            .setRequired(true)
            .addChoices({
                name: "Postgres",
                value: 1
            })
            .addChoices({
                name: "Redis",
                value: 2
            })
    ),
    permissions: {
        users: ["233955058604179457"]
    },
    function: async (interaction: CommandInteraction)=>{
        const debugOpt = interaction.options.get("service", true).value as number;
        await interaction.deferReply({ephemeral: true});
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({text: "Service Testing ToolKit"});
        switch(debugOpt) {
            case 1: {
                // Postgres Test (just run some operation and return the roundtrip time)
                embed.setTitle("Postgres Testing")
                    .setColor("#00FFFF");
                if(!prisma) {
                    embed.setColor("#FF0000")
                        .setDescription("Postgres unavailable")
                    await interaction.followUp({embeds:[embed], ephemeral: true});
                    return;
                }
                embed.setDescription(dbDescription());
                await interaction.followUp({embeds:[embed], ephemeral: true});
                const SampleuserID = "000000000000000000"
                // Test Create Query
                let createQTime = (new Date()).getTime();
                await prisma.members.create({
                    data: {
                        id: SampleuserID,
                        tag: "User#0000",
                        rulesconfirmedon: new Date()
                    }
                })
                createQTime = (new Date()).getTime() - createQTime;
                embed.setDescription(dbDescription(createQTime))
                await interaction.editReply({embeds:[embed]});
                // Test Select Query
                let selectQTime = (new Date()).getTime();
                await prisma.members.findUnique({
                    where: {
                        id: SampleuserID
                    }
                })
                selectQTime = (new Date()).getTime() - selectQTime;
                embed.setDescription(dbDescription(createQTime, selectQTime))
                await interaction.editReply({embeds:[embed]});
                // Test Update Query
                let updateQTime = (new Date()).getTime();
                await prisma.members.update({
                    data: {
                        tag: "NewUser#0000"
                    },
                    where: {
                        id: SampleuserID
                    }
                })
                updateQTime = (new Date()).getTime() - updateQTime;
                embed.setDescription(dbDescription(createQTime, selectQTime, updateQTime))
                await interaction.editReply({embeds:[embed]});
                // Test Delete Query
                let deleteQTime = (new Date()).getTime();
                await prisma.members.delete({
                    where: {
                        id: SampleuserID
                    }
                })
                deleteQTime = (new Date()).getTime() - deleteQTime;
                embed.setDescription(dbDescription(createQTime, selectQTime, updateQTime, deleteQTime))
                await interaction.editReply({embeds:[embed]});
                return;
            }
            case 2: {
                // Redis Test (just run some operation and return the roundtrip time)
                const testKey = "testKey:TestingKey"
                embed.setTitle("Redis Testing")
                    .setColor("#00FFFF");
                if(!redis) {
                    embed.setColor("#FF0000")
                        .setDescription("Redis unavailable")
                    await interaction.followUp({embeds:[embed], ephemeral: true});
                    return;
                }
                await interaction.followUp({embeds:[embed], ephemeral: true});
                // Test Create Key
                let createKTime = (new Date()).getTime();
                await redis.SET(testKey, "SampleKey");
                createKTime = (new Date()).getTime() - createKTime;
                embed.setDescription(redisDesc(createKTime))
                await interaction.editReply({embeds:[embed]});
                // Test Read Key
                let ReadKTime = (new Date()).getTime();
                await redis.SET(testKey, "SampleKey");
                ReadKTime = (new Date()).getTime() - ReadKTime;
                embed.setDescription(redisDesc(createKTime, ReadKTime))
                await interaction.editReply({embeds:[embed]});
                // Test Delete Key
                let deleteKTime = (new Date()).getTime();
                await redis.UNLINK(testKey);
                deleteKTime = (new Date()).getTime() - deleteKTime;
                embed.setDescription(redisDesc(createKTime, ReadKTime, deleteKTime))
                await interaction.editReply({embeds:[embed]});
                return;
            }
            default: {
                embed.setTitle("Testing Utility")
                embed.setDescription("Invalid Debug Option, something in the source gone wrong?")
                embed.setColor("#FF0000")
                await interaction.followUp({embeds:[embed], ephemeral: true});
                return;              
            }
        }
    },
    disabled: false,
} as ICommand;