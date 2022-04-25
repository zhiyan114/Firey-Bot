import { MessageEmbed, GuildMember, Client, TextChannel } from "discord.js";

export default async (member : GuildMember, client : Client) => {
    const embed = new MessageEmbed()
        .setTitle("Welcome to the server!")
        .setDescription(`Welcome to the Derg server, ${member.user.username}! Please read the rules and press the confirmation button to get full access.`)
        .setColor("#0000FF")
    await member.send({embeds: [embed]});
    // Send message to channel 907121158376288307
    const channel = await client.channels.fetch("907121158376288307");
    const embed2 = new MessageEmbed()
        .setTitle("New Member")
        .setDescription(`**${member.user.username}#${member.user.discriminator}** has joined the server!`)
        .setColor("#00FFFF")
    await (channel as TextChannel).send({embeds: [embed2]});
}