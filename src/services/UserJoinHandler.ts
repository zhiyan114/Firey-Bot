import { MessageEmbed, GuildMember, Client, TextChannel, Constants, DiscordAPIError } from "discord.js";
import * as Sentry from '@sentry/node';
import { welcomeChannelID } from "../../config.json";

export default async (member : GuildMember, client : Client) => {
    // Send message to channel 907121158376288307
    const channel = await client.channels.fetch(welcomeChannelID) as TextChannel;
    const embed2 = new MessageEmbed()
        .setTitle("New Member")
        .setDescription(`**${member.user.username}#${member.user.discriminator}** has joined the server!`)
        .setColor("#00FFFF")
    await channel.send({embeds: [embed2]});
    // Send the message to the user
    const embed = new MessageEmbed()
        .setTitle("Welcome to the server!")
        .setDescription(`Welcome to the Derg server, ${member.user.username}! Please read the rules and press the confirmation button to get full access.`)
        .setColor("#0000FF")
    try {
        await member.send({embeds: [embed]});
    } catch(ex : any) {
        if(ex instanceof DiscordAPIError && ex.code === Constants.APIErrors.CANNOT_MESSAGE_USER)
            return channel.send({content:`||<@${member.user.id}> You've received this message here because your DM has been disabled||`,embeds: [embed]});
        Sentry.captureException(ex);
    }
    
}