import { defer, Dictionary } from "core";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import { createFolder } from "./createFolder.ts";
import { createSet } from "./createSet.ts";
import { Preferences, User } from "database";
import { text } from "../../../core/languages/index.ts";

export async function setupNewLanguage(interaction: ModalSubmitInteraction | ButtonInteraction | ChatInputCommandInteraction, language: string) {
    await defer(interaction);
    // hz need fix
    // const dictionary = new Dictionary({
    //     userId: (await (await User.findOneBy({ discordIDS: interaction.user.id })).id),
    //     language: {
    //         source: language,
    //         target: await Preferences.findOneBy({ id: dictionary.userId }).then(preferences => preferences.interfaceLanguage),
    //         name: `${language} - ${await Preferences.findOneBy({ id: dictionary.userId }).then(preferences => preferences.interfaceLanguage)}`

    //     }, folderIds: [], flashcardIds: [], setIds: [], folders: [], sets: [], flashcards: [], user: undefined, preferences: undefined
    // });
    const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("set:create").setLabel(text("create_set.title", "en")).setStyle(ButtonStyle.Primary),
    )
    ];

    const embeds = [
        new EmbedBuilder().setTitle(text("create_set.title", "en")).setDescription(text("create_Set.name_first_set", "en")).setTimestamp()
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
                // await createSet(interaction, dictionary, "");
            }
        }
    });


}