import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { ICommand } from "../interface";
import { getAmqpConn } from "../utils/DatabaseManager";
import { FfprobeData, ffprobe } from 'fluent-ffmpeg';
import https from 'https';
import { randomUUID } from "crypto";
import { createWriteStream } from 'fs';
import { DiscordUser } from "../ManagerUtils/DiscordUser";
import { client } from "..";

// More language are available here: https://github.com/openai/whisper#available-models-and-languages
// Make PR if you want to add your language here
const languageOpt = [
    {
        name: "English",
        value: "English",
    },
    {
        name: "Spanish",
        value: "Spanish",
    },
    {
        name: "French",
        value: "French",
    },
    {
        name: "Italian",
        value: "Italian",
    },
    {
        name: "Japanese",
        value: "Japanese",
    },
    {
        name: "Korean",
        value: "Korean",
    },
    {
        name: "Chinese",
        value: "Chinese",
    }
]
type queueResponse = {
    success: true,
    userID: string,
    interactID: string,
    result: string,
    processTime: number, // Process time in millisecond
} | {
    success: false,
    userID: string,
    interactID: string,
    refund: number,
    reason: string; // User Display Error
}
type queueRequest = {
    userID: string,
    interactID: string,
    cost: number,
    mediaLink: string,
    language: string | undefined,
}
// Save the user file to a disk for ffprobe to process
const saveToDisk = (url: string): Promise<string> => {
    return new Promise<string>(async(res,rej)=>{
        https.get(url, async(resp)=>{
            const fileName = randomUUID();
            const fStream = createWriteStream(fileName)
            resp.pipe(fStream);
            fStream.on('finish',()=> res(fileName))
            fStream.on('error',(err)=> rej(err))
            resp.on('error',(err)=> rej(err));
        })
    })
};
// Make ffprobe async function
const ffProbeAsync = (file: string) => new Promise<FfprobeData>(async(res,rej)=>
    ffprobe(file,(err,data)=>{
        if(err) return rej(err);
        res(data);
    })
)

const getBaselineEmbed = () => new EmbedBuilder()
.setTitle("Whisper")
.setFooter({text: "OpenAI's Speech to Text Model"})
.setTimestamp();

const sendQName = "WhisperReq"
const receiveQName = "WhisperRes"

/*
Queue Receiver System. Rather than placing this under `src/services`, it will be placed here for experimental purposes.
*/
const queuedList: CommandInteraction[] = [];
getAmqpConn().then(k=>{
    k?.createChannel().then(async(ch)=>{
        await ch.assertQueue(receiveQName);
        ch.consume(receiveQName,async(msg)=>{
            if(!msg) return;
            // Check if the interactionCommand still in the queuedList
            const queueItem = JSON.parse(msg.content.toString()) as queueResponse;
            const iCommand = queuedList.find(cmd=>cmd.id === queueItem.interactID)
            // Check if the service got rejected or not
            const fetchUser = await client.users.fetch(queueItem.userID)
            if(!queueItem.success) {
                // Refund the user first
                const user = new DiscordUser(fetchUser)
                await user.economy.grantPoints(queueItem.refund);
                // Setup the embed message
                const failEmbed = getBaselineEmbed().setColor("#FF0000")
                    .setDescription(`ML Server Rejected Your Request: ${queueItem.reason}`)
                // Check if the interaction exist, otherwise send the rejection to the user's DM instead
                if(!iCommand) {
                    await (await client.users.fetch(queueItem.userID)).send({
                        content: "Due to some backend issues, we're not able to follow-up the interaction. Instead, sending it to your DM.",
                        embeds:[failEmbed]
                    })
                    return ch.ack(msg);
                }
                // Clean up then follow-up with the error
                const cmdIndex = queuedList.findIndex((cmd)=>cmd === iCommand);
                if(cmdIndex !== -1) queuedList.splice(cmdIndex, 1);
                await iCommand.followUp({embeds:[failEmbed]})
                return ch.ack(msg);
            }
            // Service seems to be accepted, setup the embed
            const successEmbed = getBaselineEmbed()
                .setColor("#00FF00")
                .setDescription(queueItem.result)
                .addFields({name: "Processing Time", value: queueItem.processTime.toString()})
            if(iCommand) {
                // Follow up with the user via interaction follow-up
                await iCommand.followUp({embeds: [successEmbed]})
                // Delete the interact object from the queueList and finalize it
                const cmdIndex = queuedList.findIndex((cmd)=>cmd === iCommand);
                if(cmdIndex !== -1) queuedList.splice(cmdIndex, 1);
                return ch.ack(msg);
            }
            // interactionCommand no longer exist, probably because the bot crashed while it tries to process it. Send it to the user's DM instead.
            await fetchUser.send({
                content: "Due to some backend issues, we're not able to follow-up the interaction. Instead, sending it to your DM.",
                embeds:[successEmbed]
            })
            return ch.ack(msg)
        })
    })
})
// Command Core
export default {
    command: new SlashCommandBuilder()
    .setName('whisper')
    .setDescription(`(Experimental) Convert (and translate) audio to text via OpenAI whisper`)
    .addAttachmentOption(opt=>
        opt.setName("file")  
        .setDescription("Only mp3 and ogg file are supported (75 points/minute)")
        .setRequired(true)
    )
    .addStringOption(opt=>
        opt.setName("language")
        .setDescription("Process the audio in a specific language, otherwise auto (25 points/minute). Using it to translate language other than English will not be guaranteed.")
        .setRequired(false)
        .addChoices(...languageOpt)
    ),
    function: async (command)=>{
        const mqConn = await getAmqpConn();
        if(!mqConn) return;
        // Pull all the options
        
        const file = command.options.get("file", true).attachment;
        const language = command.options.get('language', false)?.value as string | undefined;
        // Setup Embed
        const embed = getBaselineEmbed();
        // Save the file to disk and load it into ffprobe
        if(!file?.url) return;
        const fName = await saveToDisk(file.url);
        const audioInfo = await ffProbeAsync(fName)
        // Validate the file format.
        // Will not support other audio format to keep things simple
        if(!['mp3','ogg'].find(f=>audioInfo.format.format_name === f))
            return embed.setColor("#0FF0000").setDescription("Invalid Audio Format, only mp3 and ogg is supported");
        // Try to subtract the user's points balance and decline if not enough balance
        const user = new DiscordUser(command.user);
        // 75 points/min + 25 points/min if translation enabled. Duration are in seconds. Correct the price if this is the incorrect unit.
        let price = 75/60
        if(language) price += 25/60;
        if(command.user.id !== "233955058604179457") // Developer Access to perform extensive testing
            if(!audioInfo.format.duration || !(await user.economy.deductPoints(audioInfo.format.duration*price))) return embed.setColor("#FF0000")
                .setDescription(`You may not have enough points for this processing. Please have a total of ${(audioInfo.format.duration ?? -0.04)*25} points before trying again.`);
        // All the checks are all passing, send a queue request
        const channel = (await (await getAmqpConn())?.createChannel());
        if(!channel) return;
        await channel.assertQueue(sendQName);
        const packedContent = JSON.stringify({
            userID: command.user.id,
            interactID: command.id,
            mediaLink: file.url,
            cost: price,
            language: language === undefined ? null : language,
        } as queueRequest)
        channel.sendToQueue(sendQName,Buffer.from(packedContent))
        await channel?.close();
    },
    disabled: process.env['AMQP_CONN'] ?? false,
} as ICommand;