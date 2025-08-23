import { ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ComponentType, ButtonStyle, ChatInputCommandInteraction } from "discord.js";

async function defer(
    interaction:
        | ButtonInteraction
        | StringSelectMenuInteraction
        | ModalSubmitInteraction
        | ChatInputCommandInteraction,
    content: string = ""
) {

    const noneed = interaction.isChatInputCommand() || interaction.customId.split(":")[2] === "noneed";
    if (interaction.isChatInputCommand()) {
        await interaction[interaction.isChatInputCommand() ? "deferReply" : "deferUpdate"]();

    }
    if (noneed) return;
    await interaction[interaction.isChatInputCommand() || !interaction.message ? "deferReply" : "deferUpdate"]();
    await interaction[interaction.isChatInputCommand() || !interaction.message ? "followUp" : "editReply"]({
        content,
        components: interaction.message.components.map((a) => {
            return new ActionRowBuilder<
                ButtonBuilder | StringSelectMenuBuilder
            >().addComponents(
                // @ts-ignore
                a.components.map((b) => {
                    if (b.type === ComponentType.Button) {
                        return new ButtonBuilder(b.data)
                            .setDisabled(true)
                            .setStyle(ButtonStyle.Secondary);
                    } else if (b.type === ComponentType.StringSelect) {
                        return new StringSelectMenuBuilder(b.data).setDisabled(true);
                    }
                })
            );
        }),
    });
}

export { defer }