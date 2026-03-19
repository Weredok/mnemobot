import { defer, Dictionary } from "core";
import { ButtonInteraction, ChatInputCommandInteraction, ActionRowBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from "discord.js";
import { createWord } from "./createWord.ts";
import { text } from "../../../core/languages/index.ts";

export async function createSet(interaction: ButtonInteraction | ChatInputCommandInteraction, dictionary: Dictionary, name: string) {
    await interaction.showModal({
        customId: "set:creator",
        title: `${text("create_set.title", dictionary.language.target)} ${dictionary.language}`,
        components: [
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("name")
                    .setLabel(text("create_set.name", dictionary.language.target))
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
        dictionary.addSet(name);
        console.log(dictionary)
        await dictionary.syncronize(true).catch(console.error);
        await i.followUp(text("create_set.successful", dictionary.language.target).replace("{name}", name));
        const message = await interaction.editReply({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("word:create").setLabel(text("create_set.button_create", dictionary.language.target)).setStyle(ButtonStyle.Success))], embeds: [new EmbedBuilder().setTitle(text("create_set.setting_up", dictionary.language.target)).setDescription(text("create_set.create_word_via_set", dictionary.language.target)).setTimestamp()] });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 10 * 60 * 1000
        });

        collector.once("collect", async (interaction) => {
            if (!interaction.isButton()) return;
            await createWord(interaction, dictionary);
        })
    });
}