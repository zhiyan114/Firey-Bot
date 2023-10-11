import { AttachmentBuilder, DiscordAPIError, EmbedBuilder, Message, SlashCommandBuilder } from "discord.js";
import { ICommand } from "../interface";
import { getAmqpConn, isAmqpConnected } from "../utils/DatabaseManager";
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
];
type queueResponse = {
    success: true,
    userID: string,
    jobID: string,
    cost: number,
    result: string,
    processTime: number, // Process time in millisecond
} | {
    success: false,
    userID: string,
    jobID: string,
    cost: number,
    reason: string; // User Display Error
}
type queueRequest = {
    userID: string,
    jobID: string,
    cost: number,
    mediaLink: string,
    init_prompt?: string,
    language?: string,
}

const getBaselineEmbed = () => new EmbedBuilder()
  .setTitle("Whisper")
  .setFooter({text: "OpenAI's Speech to Text Model"})
  .setTimestamp();

const sendQName = "WhisperReq";
const receiveQName = "WhisperRes";

const serviceEnabled = (process.env["AMQP_CONN"] ?? false) && enableExtra.whisper;
/*
Queue Receiver System. Rather than placing this under `src/services`, it will be placed here for experimental purposes.
*/
let mainChannel: Channel | undefined;

const initListener = () =>
  getAmqpConn().then(k=>{
    k?.createChannel().then(async(ch)=>{
      // Load the channel data for command to use
      mainChannel = ch;
      await ch.assertQueue(sendQName, {durable: true});
      await ch.assertQueue(sendQName+"_Pro", {durable: true});
      await ch.assertQueue(receiveQName, {durable: true});
      ch.on("close", async()=>{
        mainChannel = undefined;
        while(!isAmqpConnected()) await new Promise<void>((res)=>setTimeout(res, 3000));
        initListener();
      });
      // Handle all the receiving events
      ch.consume(receiveQName, async(msg)=>{
        if(!msg) return;
        // Check if the interactionCommand still in the queuedList
        const queueItem = JSON.parse(msg.content.toString()) as queueResponse;
        const fetchUser = await client.users.fetch(queueItem.userID);
        const user = new DiscordUser(fetchUser);

        // Determine the result and generate an appreciate embed and files for it
        const files: AttachmentBuilder[] = [];
        let embed = getBaselineEmbed().addFields({name: "Job ID", value: queueItem.jobID});
        if(queueItem.success) {
          // The processing was successful
          embed = embed.setColor("#00FF00")
            .addFields({name: "Price", value:`${queueItem.cost} points`})
            .addFields({name: "Text Size", value: `${queueItem.result.length} characters`})
            .addFields({name: "Processing Time", value: `${queueItem.processTime.toFixed(2)}s`});
          if(queueItem.result.length > 2000) {
            embed.setDescription("The text is way too long, sent as a file instead.");
            files.push(new AttachmentBuilder(Buffer.from(queueItem.result, "utf8"), {
              name: `${randomUUID()}.txt`
            }));
          } else embed.setDescription(queueItem.result);
        } else {
          // The processing was unsuccessful
          await user.economy.grantPoints(queueItem.cost); // Refund the user
          embed = embed.setColor("#FF0000")
            .setDescription(`ML Server Rejected Your Request: ${queueItem.reason}`);
        }
            
        // Send it via user's DM
        try {
          await fetchUser.send({
            embeds:[embed],
            files,
          });
          return ch.ack(msg);
        } catch(ex) {
          // Only capture the error if it's not caused by the user's DM setting
          if(!(ex instanceof DiscordAPIError && ex.code === APIErrors.CANNOT_MESSAGE_USER)) return captureException(ex);
          // We'll be nice to the end-user and give them 10 minutes to download the file from the general channel before it's deleted
          const channel = await client.channels.fetch(generalChannelID);
          // We'll discard their result if the general channel somehow got deleted. At this point, it's the user's fault for not turning on their DM.
          if(!channel) return ch.nack(msg, false, false);
          let dMsgObj: Message | undefined;
          if(channel.isTextBased() || channel.isVoiceBased() || channel.isThread()) dMsgObj = await channel.send({
            content: ` <@${queueItem.userID}> I told you to enable your DM when using this command... Welp, you have 10 minutes to download the file before it gets deleted`,
            embeds: [embed],
            files,
          });
          ch.ack(msg);
          if(!dMsgObj) return;
          await (new Promise<void>((res)=>setTimeout(res, 1000*600))); // Wait for 10 minutes before deleting it
          await dMsgObj.delete();
        }
      });
    });
  });
if(serviceEnabled) initListener();
// Command Core
export default {
  command: new SlashCommandBuilder()
    .setName("whisper")
    .setDescription("(Experimental) Convert (and translate) audio to text via OpenAI whisper")
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
    )
    .addStringOption(opt=>
      opt.setName("prompt")  
        .setDescription("Set the inital prompt for the generation (i.e. hint words)")  
        .setRequired(false)
    )
    .addBooleanOption(opt=>
      opt.setName("premium")  
        .setDescription("Using large-v2 model to process instead of small/base/tiny. (x2 points cost)")
        .setRequired(false)
    ),
  function: async (command)=>{
    // Prerequisite checks
    if(!mainChannel) return await command.reply({content: "Queue server is currently down, please try again later."});
    const mqConn = await getAmqpConn();
    if(!mqConn) return;

    // Pull all the option data
    const file = command.options.get("file", true).attachment;
    const language = command.options.get("language", false)?.value as string | undefined;
    const isPremium = command.options.get("premium", false)?.value === true;
    const initPrompt = command.options.get("prompt", false)?.value as string | undefined;
    await command.deferReply({ephemeral: true});
        
    // Setup Embed
    const jobID = `${command.id}${isPremium ? "_Premium" : ""}`;
    const embed = getBaselineEmbed()
      .setColor("#FF0000")
      .addFields({name: "Job ID", value: jobID});
        
    // Save the file to disk and load it into ffprobe
    if(!file?.url) return;
    const fName = randomUUID();
    const audioInfo = await (async()=>{
      try {
        await saveToDisk(file.url, fName);
        return await ffProbeAsync(fName);
      } catch(ex) {
        captureException(ex);
        return;
      }
    })();
    const fileInfo = statSync(fName);
    await unlink(fName);

    if(!audioInfo) return await command.followUp({embeds:[embed
      .setDescription("The file you supplied is an invalid media file.")], ephemeral: true});
    // Validate the file format. Will not support other audio format to keep things simple
    if(!["mp3","ogg"].find(f=>audioInfo.format.format_name === f) || !audioInfo.format.duration)
      return await command.followUp({embeds:[embed.setDescription("Invalid Audio Format, only mp3 and ogg is supported")], ephemeral: true});
    // Reject the audio if it's' either larger than 300MB or longer than 2 hours.
    if(audioInfo.format.duration > 60*60*2 || fileInfo.size/(1024*1024) > 300) return await command.followUp({embeds:[embed.setDescription("Audio is too large. It might be bigger than 300 MB or longer than 2 hours.")], ephemeral: true});
    const user = new DiscordUser(command.user);

    // 75 points/min + 25 points/min if translation enabled. Duration are in seconds. Correct the price if this is the incorrect unit.
    let price = 75/60;
    if(language) price += 25/60;
    if(isPremium) price *= 2;
    price = Math.ceil(audioInfo.format.duration*price);

    // Ask the user if they want to continue with the processing before sending the request
    const PromptRes = await PromptConfirmation(command, {
      text: `Would you like to confirm your processing job for ${price} points?`,
      btnName: {confirm: "confirm", decline: "decline"}
    });
    if(!PromptRes) return await command.editReply({
      embeds: [
        embed.setColor("#FFFF00")
          .setDescription("You have decline the processing job")
      ],
      components: []
    });
        
    // Try to subtract the user's points balance and decline if not enough balance
    if(price > 0 && command.user.id !== "233955058604179457") // zhiyan114 is free ^w^ (Actually no, I'm paying for the server cost so :/)
      if(!(await user.economy.deductPoints(price))) return await command.editReply({embeds:[embed
        .setDescription(`You do not have enough points for this processing. You currently have ${await user.economy.getBalance()} points.`)], components: []});
    // User consent to the processing, send it to the queue
    const packedContent = JSON.stringify({
      userID: command.user.id,
      jobID,
      mediaLink: file.url,
      cost: price,
      language,
      initPrompt,
    } as queueRequest);

    mainChannel.sendToQueue(`${sendQName}${isPremium ? "_Pro" : ""}`,Buffer.from(packedContent));
    await command.editReply({
      embeds: [
        embed.setColor("#00FF00")
          .setDescription(`Your request has been queued and will be processed shortly! Once processed, I'll be delivered to your DM so make sure it's turned on. ${isPremium ? "It seems like requested a premium processing. Due to the operation expense, the server will only be enable on-demand. Please DM zhiyan114 to confirm this." : ""}`)
      ],
      components: []
    });
  },
  disabled: !serviceEnabled,
} as ICommand;