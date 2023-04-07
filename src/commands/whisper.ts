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
    reason: string; // User Display Error
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
            if(!queueItem.success) {
                const failEmbed = getBaselineEmbed().setColor("#FF0000")
                    .setDescription(`ML Server Rejected Your Request: ${queueItem.reason}`)
                // Check if the interaction exist, otherwise send the rejection to the user's DM instead
                if(!iCommand) {
                    await (await client.users.fetch(queueItem.userID)).send({
                        content: "Due to some backend issues, we're not able to follow-up the interaction. Instead, sending it to your DM instead.",
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
            await (await client.users.fetch(queueItem.userID)).send({
                content: "Due to some backend issues, we're not able to follow-up the interaction. Instead, sending it to your DM instead.",
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
        .setDescription("Only mp3 and ogg file are supported (pricing: 75 points per minute)")
        .setRequired(true)
    )
    .addStringOption(opt=>
        opt.setName("language")
        .setDescription("The audio language")
        .setRequired(true)
        .addChoices(...languageOpt)
    )
    .addBooleanOption(opt=>
        opt.setName("translate")
        .setDescription("Translate the language to english (pricing: 25 points per minute)")
        .setRequired(true)
    )
    ,
    function: async (command)=>{
        const mqConn = await getAmqpConn();
        if(!mqConn) return;
        // Pull all the options
        
        const file = command.options.get("file", true).attachment;
        const language = command.options.get('language', true).value as string;
        const translate = command.options.get('translate', true).value as boolean;
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
        /* Audio length to price prediction (based on 25 characters/second).
            This check is to ensure the user has sufficient funds before processing the audio as we don't know how many letters are in the audio and
            it would be a waste of computation power if the user declines the pricing after it has been processed. If the prediction does underestimate, the user
            will accumulate a negative balance.
        */
        const user = new DiscordUser(command.user);
        if(!audioInfo.format.duration || audioInfo.format.duration*25 > ((await user.getCacheData())?.points ?? 0)) return embed.setColor("#FF0000")
            .setDescription(`You may not have enough points for this processing. Please have a total of ${(audioInfo.format.duration ?? -0.04)*25} points before trying again.`)
        // Assuming the checks are all passing, send the processing request to the queue
        // @TODO: FINISH THIS QUEUE SYSTEM AND PYTHON SCRIPT THAT HANDLES THE PROCESSING
        
    },
    disabled: process.env['AMQP_CONN'] ?? false,
} as ICommand;