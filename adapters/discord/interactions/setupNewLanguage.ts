import { defer, Dictionary } from "core";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import { createFolder } from "./createFolder.ts";
import { createSet } from "./createSet.ts";
import { Preferences, User } from "database";

export async function setupNewLanguage(interaction: ModalSubmitInteraction | ButtonInteraction | ChatInputCommandInteraction, dictionary: Dictionary, language: string) {
    await defer(interaction);
    dictionary = new Dictionary();
    dictionary.userId = (await (await User.findOneBy({ discordIDS: interaction.user.id })).id)


    dictionary.language = {
        source: language,
        target: await Preferences.findOneBy({ user: dictionary.userId }).then(preferences => preferences.interfaceLanguage),
        name: `${language} - ${await Preferences.findOneBy({ user: dictionary.userId }).then(preferences => preferences.interfaceLanguage)}`

    }
    dictionary.folders = [];
    dictionary.sets = [];
    dictionary.flashcards = [];
    const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("set:create").setLabel("Создать набор").setStyle(ButtonStyle.Primary),
    )
    ];

    const embeds = [
        new EmbedBuilder().setTitle("Настройка нового языка").setDescription("Как назовём первый набор слов в новом словаре?").setTimestamp()
    ];

    const message = await interaction.followUp({ embeds, components });

    const collector = message.createMessageComponentCollector({
        time: 10 * 60 * 1000
    });

    collector.on("collect", async (interaction) => {
        if (interaction.isButton()) {
            if (interaction.customId === "folder:create") {
                // await createFolder(interaction, dictionary);
            } else if (interaction.customId === "set:create") {
                await createSet(interaction, dictionary, "");
            }
        }
    });


}