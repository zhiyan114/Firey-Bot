import type { CommandInteraction, GuildMember } from "discord.js";
import type { DiscordClient } from "../../core/DiscordClient";
import { InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { baseCommand } from "../../core/baseCommand";
import { DiscordUser } from "../../utils/DiscordUser";
import { DiscordInvite } from "../../utils/DiscordInvite";

export class kickCommand extends baseCommand {
  client: DiscordClient;
  metadata = new SlashCommandBuilder();
  access = {
    users: [],
    roles: [] as string[],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.access.roles.push(client.config.adminRoleID);
    this.metadata
      .setName("kick")
      .setDescription("Kicks a target user.")
      .setContexts([InteractionContextType.Guild])
      .addUserOption(option =>
        option.setName("user")
          .setDescription("The user to kick.")
          .setRequired(true)
      )
      .addStringOption(option=>
        option.setName("reason")
          .setDescription("The reason for the kick, user will see this.")
          .setRequired(true)
      )
      .addBooleanOption(option=>
        option.setName("invite")
          .setDescription("Whether or not to include a one-time use invite link for the user to join back.")
          .setRequired(true)
      );
  }

  public async execute(interaction: CommandInteraction) {
    const targetMember = interaction.options.get("user", true).member as GuildMember | null;
    if(!targetMember || targetMember.user.bot)
      return await interaction.reply("Invalid User has been supplied");

    // supplied info
    const reason = interaction.options.get("reason",true).value as string;
    const invite = interaction.options.get("invite",true).value as boolean;
    const target = new DiscordUser(this.client, targetMember.user);
    const issuer = new DiscordUser(this.client, interaction.user);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Prepare message field for target
    const kickField = [
      {
        name: "Reason",
        value: reason,
      },
      {
        name: "Kicked By",
        value: issuer.getUsername(),
      },
    ];
    if(invite) {
      const inviteLink = await new DiscordInvite(this.client, `kickInvite:${targetMember.id}`)
        .getTempInvite({
          maxAge: 604800,
          maxUses: 1,
          nocache: true,
        });
      kickField.push({
        name: "Invite Link",
        value: inviteLink,
      });
    }

    // Handle the target user
    await target.sendMessage({
      title: "Kicked",
      color: "#FFFF00",
      message: `You have been kicked from ${interaction.guild?.name ?? "unknown"}!${invite ? " A re-invite link has been attached to this message (expires in 1 week)." : ""}`,
      fields: kickField,
    });
    await targetMember.kick(reason);

    // Handle the cleanup
    await issuer.actionLog({
      actionName: this.metadata.name,
      target,
      message: `<@${targetMember.id}> has been kicked by <@${interaction.user.id}>`,
      reason,
    });
    await interaction.followUp({ content: "User has been successfully kicked!", ephemeral: true });

  }
}