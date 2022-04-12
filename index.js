//const sqlite = require('sqlite');
//const sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');
const { Client, Intents, MessageEmbed, MessageSelectMenu } = require('discord.js');
require("./CmdRegister.js");
//const db = require("./DatabaseInit.js");

const commandList = {};
// Load commands from the command directory
const dir = path.join(__dirname, 'commands');
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.js')) {
        const cmdModule = require(path.join(dir, file));
        if(!cmdModule.disabled) commandList[cmdModule.command.name] = cmdModule.function;
    }
});

/* Client Loader */
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MEMBERS], partials: ["CHANNEL"] });

client.on('ready', async () => {
  //client.user.setActivity('everyone below me', { type: 'WATCHING' });
  //client.user.setStatus('idle');
  client.user.setPresence({
    status: "idle",
    activities: [{
      name: "all furries UwU",
      type: "WATCHING",
    }]
  })
  await require('./ReactRoleHandler.js')(client);
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    if (!commandList[interaction.commandName]) return;
    await commandList[interaction.commandName](interaction);
  }
});
client.on('guildMemberAdd',async member => {
  const embed = new MessageEmbed()
    .setTitle("Welcome to the server!")
    .setDescription(`Welcome to the Derg server, ${member.user.username}! Please read the rules and reply \`I agree with the rules\` to get access to the server.`)
    .setColor("#0000FF")
  member.send({embeds: [embed]});
});
client.on('messageCreate',async(message)=>{
  // Check if the message is from this client
  if (message.author.id === client.user.id) return;
  // Check if the message is from DM
  if (message.channel.type != 'DM') return;
  // Get member from user ID
  const guild = await client.guilds.cache.find(opt=>opt.id == "906899666656956436")
  const member = (await guild.members.fetch()).find(opt=>opt.id == message.author.id);
  // Check if the member has a role
  if (!member.roles.cache.find(opt=>opt.id == "907768073442983966")) {
    // Create Embed
    const embed = new MessageEmbed()
      .setTitle("Rules Verification")
      .setFooter({text: "Administration Team"})
      .setTimestamp();
    if(message.content.toLowerCase() === "I agree with the rules") {
      embed.setColor("#00FF00")
      embed.setDescription("Thank you for reading and agreeing with the rules. You should now have full access to the server.");
      await member.roles.add(guild.roles.cache.find(opt=> opt.id == '907768073442983966'), "User Read the rules");
      await message.reply({embeds: [embed]});
      return;
    }
    embed.setColor("#FF0000");
    embed.setDescription("You must agree with the rules to join the server! To do so, please reply: `I agree with the rules`");
    await message.reply({embeds: [embed]});
    return
  }
  message.reply("You've already verified, there is nothing you can do in my DM right now. Sorry ;(");
});

client.login('OTYzNDIwODYyNDgzMTQ0NzM1.YlV1mQ.06-w0uXaPMtmjKIDgs2gFgoCjMQ');