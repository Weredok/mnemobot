import { defer, Dictionary } from "core";
import { Flashcard } from "database";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { text } from "../../../core/languages/index.ts";

export async function createWord(interaction: ButtonInteraction | ChatInputCommandInteraction, dictionary: Dictionary) {
    await interaction.showModal({
        customId: "setup_nl:wordcreator",
        title: `${text("create_word.title", dictionary.language.target)} ${dictionary.language}`,
        components: [
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("word")
                    .setLabel(text("create_word.on_target", dictionary.language.target))
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(30)
                    .setMinLength(2)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("translation")
                    .setLabel(`${text("create_word.on_target", dictionary.language.target)} ${dictionary.language}`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(30)
                    .setMinLength(2)
            )
        ]
    });

    await interaction.awaitModalSubmit({
        time: 10 * 60 * 1000
    }).then(async (i) => {
        await defer(i)
        const word = i.fields.getTextInputValue("word");
        const translation = i.fields.getTextInputValue("translation");
        dictionary.addWord([word], [translation], dictionary.sets[0].id);
        await dictionary.syncronize();
        await i.followUp(text("create_word.successful", dictionary.language.target));
        await interaction.editReply({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents( new ButtonBuilder().setLabel(text("create_word.go_to_main_menu", dictionary.language.target)).setCustomId(`dictionary:${dictionary.language}`).setStyle(ButtonStyle.Success))], });
    });
}
