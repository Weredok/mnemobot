import { defer, Dictionary } from "core";
import { ButtonInteraction, ChatInputCommandInteraction, ActionRowBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from "discord.js";
import { createWord } from "./createWord.ts";

export async function createSet(interaction: ButtonInteraction | ChatInputCommandInteraction, dictionary: Dictionary, name: string) {
    await interaction.showModal({
        customId: "set:creator",
        title: `Создание набора в словаре ${dictionary.language}`,
        components: [
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("name")
                    .setLabel("Название набора")
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
        await i.followUp(`Набор \`${name}\` успешно создан!`);
        const message = await interaction.editReply({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("word:create").setLabel("Начать").setStyle(ButtonStyle.Success))], embeds: [new EmbedBuilder().setTitle("Настройка нового языка").setDescription("А теперь создайте первое слово в вашем новом словаре").setTimestamp()] });

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