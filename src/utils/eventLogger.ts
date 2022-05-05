import { Client, TextChannel, MessageEmbed, ColorResolvable, GuildMember, User } from "discord.js";
import { logChannelID } from "../../config.json";

// Exported data for the loggers
export enum LogType {
    Command,
    Info,
    Warning,
    Error
}
export interface LogMetadata {
    [key: string]: string;
}


// Main Logging functions
let logChannel : TextChannel;

export async function initailizeLogger(channel : Client) : Promise<void> {
    // Check if the log channel alreadyinitalized
    if(logChannel !== undefined || logChannel !== null) {
        console.log("Log channel already initialized!");
        sendLog(LogType.Error, "System attempted to initialize log channel twice!");
        return;
    }
    // Configure the discord log channel
    logChannel = await channel.channels.fetch(logChannelID) as TextChannel;
}

export async function sendLog(type: LogType, message: string, extraMetadata?: LogMetadata) : Promise<void> {
    // Check if the log channel is initialized
    if(logChannel === undefined || logChannel === null) return console.log("Log channel not initialized, cannot send any logs!");
    // Create Discord Channel Log Embed
    const embed = new MessageEmbed()
        .setTitle(`${getLogType(type)} Log`)
        .setDescription(message)
        .setColor(getEmbedColor(type));
    // Add extra metadata
    if(typeof extraMetadata !== "undefined" && extraMetadata !== null) {
        for(const [key, value] of Object.entries(extraMetadata)) {
            embed.addField(key, value);
        }
    }
    // Setup footer
    embed.setTimestamp();
    embed.setFooter({text: `Internal Report System`});
    // Send the embed log
    await logChannel.send({embeds: [embed]});
}

// Internal Functions
function getEmbedColor(type: LogType) : ColorResolvable {
    switch(type) {
        case LogType.Command:
            return "#00FF00";
        case LogType.Info:
            return "#0000FF";
        case LogType.Warning:
            return "#FFFF00";
        case LogType.Error:
            return "#FF0000";
        default:
            return "#00FFFF";
    }
}
function getLogType(type: LogType) : string {
    switch(type) {
        case LogType.Command:
            return "Command";
        case LogType.Info:
            return "Info";
        case LogType.Warning:
            return "Warning";
        case LogType.Error:
            return "Error";
        default:
            return "Unknown";
    }
}