import { AttachmentBuilder, CommandInteraction, DiscordAPIError, EmbedBuilder, Message, SlashCommandBuilder, TextChannel } from "discord.js";
import { ICommand } from "../interface";
import { getAmqpConn } from "../utils/DatabaseManager";
import { randomUUID } from "crypto";
import { DiscordUser } from "../ManagerUtils/DiscordUser";
import { client } from "..";
import { unlink } from "fs/promises";
import { ffProbeAsync, saveToDisk } from "../utils/Asyncify";
import { Channel } from "amqplib";
import { statSync } from "fs";
import { enableExtra, generalChannelID } from "../config";
import { captureException } from "@sentry/node";
import { APIErrors } from "../utils/discordErrorCode";
import { PromptConfirmation } from "../utils/djUtils";

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
            const fetchUser = await client.users.fetch(queueItem.userID)
            const user = new DiscordUser(fetchUser)

            // Determine the result and generate an appreciate embed and files for it
            const files: AttachmentBuilder[] = []
            let embed = getBaselineEmbed().addFields({name: "Job ID", value: queueItem.interactID});
            if(queueItem.success) {
                // The processing was successful
                embed = embed.setColor("#00FF00")
                .addFields({name: "Price", value:`${queueItem.cost} points`})
                .addFields({name: "Text Size", value: `${queueItem.result.length} characters`})
                .addFields({name: "Processing Time", value: `${queueItem.processTime.toFixed(2)}s`});
                if(queueItem.result.length > 2000) {
                    embed.setDescription("The text is way too long, sent as a file instead.")
                    files.push(new AttachmentBuilder(Buffer.from(queueItem.result, 'utf8'), {
                        name: `${randomUUID()}.txt`
                    }))
                } else embed.setDescription(queueItem.result);
            } else {
                // The processing was unsuccessful
                await user.economy.grantPoints(queueItem.cost); // Refund the user
                embed = embed.setColor("#FF0000")
                .setDescription(`ML Server Rejected Your Request: ${queueItem.reason}`);
            }

            // If iCommand exists, follow-up the interaction
            if(iCommand) {
                try {
                    await iCommand.editReply({
                        embeds:[embed],
                        files,
                    })
                    return ch.ack(msg);
                } catch(ex) {
                    // The processing probably took too long and causing the interaction to expire. Send it to the user's DM instead.
                    // Ensure to only capture the error that isn't caused by the timeout
                    if(!(ex instanceof DiscordAPIError && ex.code === APIErrors.INVALID_WEBHOOK_TOKEN)) captureException(ex);
                } finally {
                    // Delete the iCommand object from the array
                    const cmdIndex = queuedList.findIndex((cmd)=>cmd === iCommand);
                    if(cmdIndex !== -1) queuedList.splice(cmdIndex, 1);
                }
            }
            
            // iCommand does not exist (or interaction timed out), send it via user's DM instead
            try {
                await fetchUser.send({
                    content: "We're not able to follow-up with the interaction, so we sent the result in your DM instead",
                    embeds:[embed],
                    files,
                })
                return ch.ack(msg);
            } catch(ex) {
                // Only capture the error if it's not caused by the user's DM setting
                if(!(ex instanceof DiscordAPIError && ex.code === APIErrors.CANNOT_MESSAGE_USER)) return captureException(ex);
                // We'll be nice to the end-user and give them 10 minutes to download the file from the general channel before it's deleted
                const channel = iCommand ? iCommand.channel : await client.channels.fetch(generalChannelID)
                // We'll discard their result if the general channel somehow got deleted. At this point, it's the user's fault for not turning on their DM.
                if(!channel) return ch.nack(msg, false, false);
                let dMsgObj: Message | undefined;
                if(channel.isTextBased()) dMsgObj = await channel.send({
                    content: ` <@${queueItem.userID}> I told you to enable your DM when using this command... Welp, you have 10 minutes to download the file before it gets deleted`,
                    embeds: [embed],
                    files,
                });
                ch.ack(msg)
                if(!dMsgObj) return;
                await (new Promise<void>((res)=>setTimeout(res, 1000*600))) // Wait for 10 minutes before deleting it
                await dMsgObj.delete();
            }
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
        const user = new DiscordUser(command.user);
        // 75 points/min + 25 points/min if translation enabled. Duration are in seconds. Correct the price if this is the incorrect unit.
        let price = 75/60
        if(language) price += 25/60;
        price = Math.ceil(audioInfo.format.duration*price);
        // Ask the user if they want to continue with the processing before sending the request
        const PromptRes = await PromptConfirmation(command, {
            text: `Would you like to confirm your processing job for ${price} points?`,
            btnName: {confirm: "confirm", decline: "decline"}
        })
        if(!PromptRes) return await command.editReply({
            embeds: [
                embed.setColor("#FFFF00")
                .setDescription("You have decline the processing job")
                .addFields({name:"Job ID", value: command.id})
            ],
            components: []
        })
        // Try to subtract the user's points balance and decline if not enough balance
        if(price > 0 && command.user.id !== "233955058604179457") // zhiyan114 is free ^w^ (Actually no, I'm paying for the server cost so :/)
            if(!(await user.economy.deductPoints(price))) return await command.editReply({embeds:[embed
                .setDescription(`You do not have enough points for this processing. You currently have ${await user.economy.getBalance()} points.`)], components: []});
        // User consent to the processing, send it to the queue
        const packedContent = JSON.stringify({
            userID: command.user.id,
            interactID: command.id,
            mediaLink: file.url,
            cost: price,
            language: language === undefined ? null : language,
        } as queueRequest)
        queuedList.push(command);
        if(!sendChannel) {
            const conn = await getAmqpConn();
            if(!conn) return;
            sendChannel = await conn.createChannel();
            await sendChannel.assertQueue(sendQName, {durable: true});
        }
        sendChannel.sendToQueue(sendQName,Buffer.from(packedContent))
        await command.editReply({
            content: "DO NOT DISMISS THE MESSAGE WHILE IT'S PROCESSING OR YOU WILL LOSE YOUR RESULT",
            embeds: [
                embed.setColor("#00FF00")
                .setDescription("Your request has been queued and will be processed shortly! Once processed, you'll either see the result here or in your DM. Please make sure to turn on your DM in-case the interaction fails, otherwise your result will not be guaranteed to be successfully delivered.")
                .addFields({name:"Job ID", value: command.id})
            ],
            components: []
        })
    },
    disabled: !serviceEnabled,
} as ICommand;