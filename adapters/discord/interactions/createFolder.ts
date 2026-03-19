import { defer, Dictionary } from "core";
import { ModalSubmitInteraction, ButtonInteraction, ChatInputCommandInteraction, ActionRowBuilder, TextInputBuilder, TextInputStyle, ActionRow, ButtonStyle, ButtonBuilder } from "discord.js";
import { text } from "../../../core/languages/index.ts";

export async function createFolder(interaction: ButtonInteraction | ChatInputCommandInteraction, dictionary: Dictionary) {
    await interaction.showModal({
        customId: "folder:creator",
        title: `${text("create_folder.title", dictionary.language.target)} ${dictionary.language}`,
        components: [
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("name")
                    .setLabel(text("create_folder.name", dictionary.language.target))
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
        await i.followUp(text("create_folder.successful", dictionary.language.target).replace("{name}", name));
        await i.editReply({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("set:create").setLabel(text("create_set.title", dictionary.language.target)).setStyle(ButtonStyle.Primary))] });
    });
}