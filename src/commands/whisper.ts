import { SlashCommandBuilder } from "discord.js";
import { ICommand } from "../interface";
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
export default {
    command: new SlashCommandBuilder()
    .setName('whisper')
    .setDescription(`(Experimental) Convert (and translate) audio to text via OpenAI whisper`)
    .addAttachmentOption(opt=>
        opt.setName("file")  
        .setDescription("Only mp3 and ogg file are supported (pricing: 3/5 points per character)")
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
        .setDescription("Translate the language to english (pricing: 2/5 points per character)")
        .setRequired(true)
    )
    ,
    function: async (command)=>{
        
    },
    disabled: false,
} as ICommand;