import { ChannelType, DiscordAPIError, EmbedBuilder, GuildMember, Interaction, Message, PartialUser, User, VoiceState } from "discord.js";
import { DiscordClient } from "../core/DiscordClient";
import { baseEvent } from "../core/baseEvent";
import { DiscordCommandHandler } from "./helper/DiscordCommandHandler";
import { VertificationHandler } from "./helper/DiscordConfirmBtn";
import { DiscordUser } from "../utils/DiscordUser";
import { APIErrors } from "../utils/discordErrorCode";
import { captureException } from "@sentry/node";
import { BannerPic } from "../utils/bannerGen";
import { Prisma } from "@prisma/client";

export class DiscordEvents extends baseEvent {
  client: DiscordClient;
  commandHandler: DiscordCommandHandler;
  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.commandHandler = new DiscordCommandHandler(client);
  }

  public registerEvents() {
    this.client.on("ready", this.onReady.bind(this));
    this.client.on("interactionCreate", this.createCommand.bind(this));
    this.client.on("messageCreate", this.messageCreate.bind(this));
    this.client.on("guildMemberAdd", this.guildMemberAdd.bind(this));
    this.client.on("userUpdate", this.userUpdate.bind(this));
    this.client.on("guildMemberRemove", this.guildMemberRemove.bind(this));
    this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this));
  }

  private async onReady() {
    console.log(`Logged in as ${this.client.user?.tag}!`);
    await this.client.logger.initalize();
    await this.client.logger.sendLog({
      type: "Info",
      message: "Discord client has been initialized!"
    });
    this.client.updateStatus();
  }

  private async createCommand(interaction: Interaction) {
    if(interaction.isCommand() || interaction.isContextMenuCommand())
      return await this.commandHandler.commandEvent(interaction);

    if(interaction.isButton())
      if(interaction.customId === "RuleConfirm")
        return await VertificationHandler(this.client, interaction);
  }

  private async messageCreate(message: Message) {
    // Channel Checks
    if(message.author.bot) return;
    const channel = message.channel;
    if(channel.type !== ChannelType.GuildText) return;

    // Place where user wont be awarded with points
    const noPointsConf = this.client.config.noPoints;
    if(noPointsConf.channel.length > 0 && noPointsConf.channel.find(c=>c===channel.id)) return;
    if(noPointsConf.category.length > 0 && noPointsConf.category.find(c=>channel.parentId === c)) return;

    // Grant points
    await (new DiscordUser(this.client, message.author)).economy.chatRewardPoints(message.content);
  }

  private async guildMemberAdd(member: GuildMember) {
    if(member.user.bot) return;
    const user = new DiscordUser(this.client, member.user);
    const channel = await this.client.channels.fetch(this.client.config.welcomeChannelID);
    if(!channel || channel.type !== ChannelType.GuildText) return;

    // Create new user entry
    try {
      await user.createNewUser();
    } catch(ex) {
      if(!(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P2002"))
        captureException(ex);
    }

    // Send welcome message to user
    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setTitle("Welcome to the server!")
      .setDescription(`Welcome to the Derg server, ${member.user.username}! Please read the rules and press the confirmation button to get full access.`);
    try {
      await member.send({embeds: [embed]});
    } catch(ex) {
      if(ex instanceof DiscordAPIError && ex.code === APIErrors.CANNOT_MESSAGE_USER)
        await channel.send({content:`||<@${member.user.id}> You've received this message here because your DM has been disabled||`, embeds: [embed]});
      else captureException(ex);
    }
    
    this.client.updateStatus();

    // Send a welcome banner
    const BannerBuff = await (new BannerPic()).generate(user.getUsername(), member.user.displayAvatarURL({size: 512}));
    await channel.send({files: [BannerBuff]});
  }

  private async userUpdate(oldUser: User | PartialUser, newUser: User) {
    if(oldUser.bot) return;
    if(oldUser.tag === newUser.tag)
      return;
    const user = new DiscordUser(this.client, newUser);

    // See if we need to update user's rule confirmation date
    let updateVerifyStatus = false;
    if(!(await user.getCacheData())?.rulesconfirmedon &&
      (await this.client.guilds.cache.find(g=>g.id === this.client.config.guildID)
        ?.members.fetch(newUser))
        ?.roles.cache.find(role=>role.id === this.client.config.newUserRoleID))
      updateVerifyStatus = true;
    
    await user.updateUserData({
      rulesconfirmedon: updateVerifyStatus ? new Date() : undefined
    });
  }

  private guildMemberRemove() {
    this.client.updateStatus();
  }

  private async voiceStateUpdate(old: VoiceState, now: VoiceState) {

    // Checking to see if the user needs to be reported on the log
    const config = this.client.config.VCJoinLog;
    const channel = await this.client.channels.fetch(config.channelID);
    if(!channel || channel.type !== ChannelType.GuildText) return;
    if(!now.channel) return;
    if(old.channel?.id === now.channel.id) return;
    if(!now.member || now.member.user.bot) return;
    if(config.excludeChannels.includes(now.channel.id)) return;

    // Prepare embed
    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setTitle("Voice Channel Join")
      .setThumbnail(now.member.user.displayAvatarURL({size: 512}))
      .setDescription(`<@${now.member.user.id}> has joined the voice channel <#${now.channel.id}>`)
      .setTimestamp()
      .setFields([
        {
          name: "User ID",
          value: now.member.user.id
        },
        {
          name: "Channel ID",
          value: now.channel.id
        }
      ]);
    
    // See if username needs to be added as well
    if(now.member.user.username !== now.member.user.displayName)
      embed.addFields({
        name: "Username",
        value: now.member.user.username
      });
    
    await channel.send({embeds: [embed]});
  }
}