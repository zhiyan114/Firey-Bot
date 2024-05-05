import { CommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { baseCommand } from "../../core/baseCommand";
import { DiscordUser } from "../../utils/DiscordUser";
import { DiscordInvite } from "../../utils/DiscordInvite";

export class softBanCommand extends baseCommand {
  client: DiscordClient;
  metadata = new SlashCommandBuilder();
  access = {
    users: [],
    roles: ['908090260087513098'],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.metadata
      .setName("softban")
      .setDescription("Kicks the user but also deletes their message.")
      .setDMPermission(false)
      .addUserOption(option =>
        option.setName("user")
          .setDescription("The user to softban.")
          .setRequired(true)
      )
      .addStringOption(option=>
        option.setName("reason")
          .setDescription("The reason for the softban, user will see this.")
          .setRequired(true)
      )
      .addBooleanOption(option=>
        option.setName("invite")
          .setDescription("Whether or not to include a one-time use invite link for the user to join back.")
          .setRequired(true)
      );
  }

  public async execute(interaction: CommandInteraction) {
    // Grab the data and do validation
    const targetMember = interaction.options.get("user", true).member as GuildMember | null;
    const reason = interaction.options.get("reason", true).value as string;
    const invite = interaction.options.get("invite", true).value as boolean;
    if(!interaction.guild)
      return interaction.reply({content: "This command can only be used in a server.", ephemeral: true});
    if(!targetMember)
      return interaction.reply({content: "Target you specified doesn't exist in the server.", ephemeral: true});
    const target = new DiscordUser(this.client, targetMember.user);
    const issuer = new DiscordUser(this.client, interaction.user);
    await interaction.deferReply({ephemeral: true});

    // Prepare message for target
    const sbanfield = [
      {
        name: "Reason",
        value: reason,
      },
      {
        name: "Soft Banned By",
        value: issuer.getUsername(),
      }
    ];
    if(invite) {
      const inviteLink = await new DiscordInvite(this.client, `kickInvite:${targetMember.id}`)
        .getTempInvite({
          maxAge: 604800,
          maxUses: 1,
          nocache: true,
        });
      sbanfield.push({
        name: "Invite Link",
        value: inviteLink,
      });
    }

    // Handle the target
    await target.sendMessage({
      title: "softban",
      color: "#FFA500",
      message: `You have been softban from ${interaction.guild?.name ?? "unknown"}!${invite ? " A re-invite link has been attached to this message (expires in 1 week)." : ""}`,
      fields: sbanfield,
    });
    await targetMember.ban({
      reason,
      deleteMessageSeconds: 604800
    });
    await interaction.guild.bans.remove(targetMember.user, "Softban purposes");

    // Handle the cleanup
    await issuer.actionLog({
      actionName: this.metadata.name,
      target: target,
      message: `<@${targetMember.id}> has been softban by <@${interaction.user.id}>`,
      reason,
    });
    await interaction.followUp({content: "User has been successfully softban!", ephemeral: true});

  }
}