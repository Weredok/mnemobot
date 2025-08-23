import { defer, Dictionary } from "core";
import { ModalSubmitInteraction, ButtonInteraction, ChatInputCommandInteraction, ActionRowBuilder, TextInputBuilder, TextInputStyle, ActionRow, ButtonStyle, ButtonBuilder } from "discord.js";

export async function createFolder(interaction: ButtonInteraction | ChatInputCommandInteraction, dictionary: Dictionary) {
    await interaction.showModal({
        customId: "folder:creator",
        title: `Создание папки в словаре ${dictionary.language}`,
        components: [
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("name")
                    .setLabel("Название папки")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        ]
    });

    await interaction.awaitModalSubmit({
        time: 10 * 60 * 1000
    }).then(async (i) => {
        await defer(i)
        const name = i.fields.getTextInputValue("name");
        dictionary.addFolder(name);
        await dictionary.syncronize(true);
        await i.followUp(`Папка ${name} успешно создана`);
        await i.editReply({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("set:create").setLabel("Создать набор").setStyle(ButtonStyle.Primary))] });
    });
}