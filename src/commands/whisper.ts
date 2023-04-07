import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { ICommand } from "../interface";
import { getAmqpConn } from "../utils/DatabaseManager";
import { FfprobeData, ffprobe } from 'fluent-ffmpeg';
import https from 'https';
import { randomUUID } from "crypto";
import { createWriteStream } from 'fs';
import { DiscordUser } from "../ManagerUtils/DiscordUser";

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
    result: string,
    cost: number,
    processTime: number, // Process time in millisecond
} | {
    success: false,
    reason: string; // User Display Error
}
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
const ffProbeAsync = (file: string) => new Promise<FfprobeData>(async(res,rej)=>
    ffprobe(file,(err,data)=>{
        if(err) return rej(err);
        res(data);
    })
)
export default {
    command: new SlashCommandBuilder()
    .setName('whisper')
    .setDescription(`(Experimental) Convert (and translate) audio to text via OpenAI whisper`)
    .addAttachmentOption(opt=>
        opt.setName("file")  
        .setDescription("Only mp3 and ogg file are supported (pricing: 2/5 points per character)")
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
        .setDescription("Translate the language to english (pricing: 1/5 points per character)")
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
        const embed = new EmbedBuilder()
        .setTitle("OpenAI Whisper")
        .setTimestamp();
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