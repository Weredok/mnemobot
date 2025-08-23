import { defer, Dictionary } from "core";
import { Flashcard } from "database";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export async function createWord(interaction: ButtonInteraction | ChatInputCommandInteraction, dictionary: Dictionary) {
    await interaction.showModal({
        customId: "setup_nl:wordcreator",
        title: `Создание слова в словаре ${dictionary.language}`,
        components: [
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("word")
                    .setLabel("Слово на вашем родном языке")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(30)
                    .setMinLength(2)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("translation")
                    .setLabel(`Перевод на ${dictionary.language}`)
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
        dictionary.addWord(word, translation, dictionary.sets[0].id);
        await dictionary.syncronize();
        await i.followUp(`Слово \`${word}\` успешно внесено в ваш словарь!`);
        await interaction.editReply({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("word:create").setLabel("Создать новое слово").setStyle(ButtonStyle.Primary), new ButtonBuilder().setLabel("Вернуться в меню").setCustomId(`dictionary:${dictionary.language}`).setStyle(ButtonStyle.Success))], });
    });
}
