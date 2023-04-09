import { AttachmentBuilder, BufferResolvable, CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { ICommand } from "../interface";
import { getAmqpConn } from "../utils/DatabaseManager";
import { randomUUID } from "crypto";
import { DiscordUser } from "../ManagerUtils/DiscordUser";
import { client } from "..";
import { unlink } from "fs/promises";
import { ffProbeAsync, saveToDisk } from "../utils/Asyncify";
import { Channel } from "amqplib";
import { statSync } from "fs";
import { enableExtra } from "../config";

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
    cost: number,
    result: string,
    processTime: number, // Process time in millisecond
} | {
    success: false,
    userID: string,
    interactID: string,
    cost: number,
    reason: string; // User Display Error
}
type queueRequest = {
    userID: string,
    interactID: string,
    cost: number,
    mediaLink: string,
    language: string | undefined,
}

const getBaselineEmbed = () => new EmbedBuilder()
.setTitle("Whisper")
.setFooter({text: "OpenAI's Speech to Text Model"})
.setTimestamp();

const sendQName = "WhisperReq"
const receiveQName = "WhisperRes"

const serviceEnabled = (process.env['AMQP_CONN'] ?? false) && enableExtra.whisper
/*
Queue Receiver System. Rather than placing this under `src/services`, it will be placed here for experimental purposes.
*/
const queuedList: CommandInteraction[] = [];
let sendChannel: Channel | undefined;

if(serviceEnabled)
getAmqpConn().then(k=>{
    k?.createChannel().then(async(ch)=>{
        await ch.assertQueue(receiveQName, {durable: true});
        ch.consume(receiveQName, async(msg)=>{
            if(!msg) return;
            // Check if the interactionCommand still in the queuedList
            const queueItem = JSON.parse(msg.content.toString()) as queueResponse;
            const iCommand = queuedList.find(cmd=>cmd.id === queueItem.interactID)
            // Check if the service got rejected or not
            const fetchUser = await client.users.fetch(queueItem.userID)
            if(!queueItem.success) {
                // Refund the user first
                const user = new DiscordUser(fetchUser)
                await user.economy.grantPoints(queueItem.cost);
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
                await iCommand.followUp({embeds:[failEmbed], ephemeral: true})
                return ch.ack(msg);
            }
            // Service seems to be accepted, setup the embed
            const successEmbed = getBaselineEmbed()
                .setColor("#00FF00")
                .addFields({name: "Price", value:`${queueItem.cost} points`})
                .addFields({name: "Text Size", value: `${queueItem.result.length} characters`})
                .addFields({name: "Processing Time", value: `${queueItem.processTime.toFixed(2)}s`})
            const files: AttachmentBuilder[] = []
            // Send the result as a file instead when the text exceeds 2000 characters
            if(queueItem.result.length > 2000) {
                successEmbed.setDescription("The text is way too long, sent as a file instead.")
                files.push(new AttachmentBuilder(Buffer.from(queueItem.result,'utf8'), {
                    name: `${randomUUID()}.txt`
                }))
            } else successEmbed.setDescription(queueItem.result);
            if(iCommand) {
                // Follow up with the user via interaction follow-up
                await iCommand.followUp({embeds: [successEmbed], ephemeral: true, files})
                // Delete the interact object from the queueList and finalize it
                const cmdIndex = queuedList.findIndex((cmd)=>cmd === iCommand);
                if(cmdIndex !== -1) queuedList.splice(cmdIndex, 1);
                return ch.ack(msg);
            }
            // interactionCommand no longer exist, probably because the bot crashed while it tries to process it. Send it to the user's DM instead.
            await fetchUser.send({
                content: "Due to some backend issues, we're not able to follow-up the interaction. Instead, sending it to your DM.",
                embeds:[successEmbed],
                files
            })
            return ch.ack(msg)
        })
    })
});
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
        .setDescription("Process/translate the audio in a specific language, otherwise auto (25 points/minute)")
        .setRequired(false)
        .addChoices(...languageOpt)
    ),
    function: async (command)=>{
        const mqConn = await getAmqpConn();
        if(!mqConn) return;
        // Pull all the options
        const file = command.options.get("file", true).attachment;
        const language = command.options.get('language', false)?.value as string | undefined;
        await command.deferReply({ephemeral: true});
        // Setup Embed
        const embed = getBaselineEmbed().setColor("#FF0000");
        // Save the file to disk and load it into ffprobe
        if(!file?.url) return;
        const fName = randomUUID();
        const audioInfo = await (async()=>{
            try {
                await saveToDisk(file.url, fName);
                return await ffProbeAsync(fName);
            } catch(ex) {
                return;
            }
        })();
        const fileInfo = statSync(fName);
        await unlink(fName);
        if(!audioInfo) return await command.followUp({embeds:[embed
            .setDescription(`The file you supplied is an invalid media file.`)], ephemeral: true});
        // Validate the file format. Will not support other audio format to keep things simple
        if(!['mp3','ogg'].find(f=>audioInfo.format.format_name === f) || !audioInfo.format.duration)
            return await command.followUp({embeds:[embed.setDescription("Invalid Audio Format, only mp3 and ogg is supported")], ephemeral: true})
        // Reject the audio if it's' either larger than 300MB or longer than 2 hours.
        if(audioInfo.format.duration > 60*60*2 || fileInfo.size/(1024*1024) > 300) return await command.followUp({embeds:[embed.setDescription("Audio is too large. It might be bigger than 300 MB or longer than 2 hours.")], ephemeral: true})
        // Try to subtract the user's points balance and decline if not enough balance
        const user = new DiscordUser(command.user);
        // 75 points/min + 25 points/min if translation enabled. Duration are in seconds. Correct the price if this is the incorrect unit.
        let price = 75/60
        if(language) price += 25/60;
        price = Math.ceil(audioInfo.format.duration*price);
        if(price > 0 && command.user.id !== "233955058604179457") // zhiyan114 is free ^w^ (Actually no, I'm paying for the server cost so :/)
            if(!(await user.economy.deductPoints(price))) return await command.followUp({embeds:[embed
                .setDescription(`You do not have enough points for this processing. Please have a total of ${price} points before trying again.`)], ephemeral: true});
        // All the checks are all passing, send a queue request
        queuedList.push(command);
        if(!sendChannel) {
            const conn = await getAmqpConn();
            if(!conn) return;
            sendChannel = await conn.createChannel();
            await sendChannel.assertQueue(sendQName, {durable: true});
        }
        
        const packedContent = JSON.stringify({
            userID: command.user.id,
            interactID: command.id,
            mediaLink: file.url,
            cost: price,
            language: language === undefined ? null : language,
        } as queueRequest)
        sendChannel.sendToQueue(sendQName,Buffer.from(packedContent))
    },
    disabled: !serviceEnabled,
} as ICommand;