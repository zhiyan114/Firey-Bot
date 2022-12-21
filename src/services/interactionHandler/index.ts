import { Interaction } from "discord.js";
import { client } from "../..";
import ButtonInteraction from './Button';
import ModalBoxInteraction from './ModalBox';

client.on('interactionCreate', async (interaction : Interaction) => {
    if(interaction.isButton()) return await ButtonInteraction(interaction);
    if(interaction.isModalSubmit()) return await ModalBoxInteraction(interaction);
});