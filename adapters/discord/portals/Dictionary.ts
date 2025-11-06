import { defer, Dictionary } from "core";
import { Folder, Set, User } from "database";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, InteractionCollector, Message, MessageCollector } from "discord.js";

export class DictionaryPortalAtDiscord {
    dictionary?: Dictionary;
    interaction?: ButtonInteraction | ChatInputCommandInteraction;
    message?: Message;
    collector?: InteractionCollector<ButtonInteraction>;

    constructor(dictionary: Dictionary, interaction?: ButtonInteraction | ChatInputCommandInteraction, message?: Message) {
        this.dictionary = dictionary;
        this.interaction = interaction;
        this.message = message;
    };

    async initialize(userId: number) {
        if (!this.dictionary) {
            this.dictionary = await Dictionary.findBy({ userId })[0];
            await this.dictionary.syncronize();
        };

        let message_c: Message;
        if (this.message) {
            message_c = await this.message.reply(await this.generateMainMenu());
        } else {
            message_c = await this.interaction.editReply(await this.generateMainMenu());
        };

        this.collector = message_c.createMessageComponentCollector({
            time: this.dictionary.preferences.idleTimeout,
            componentType: ComponentType.Button
        });

        this.collector.once("end", async () => {
            this.interaction.editReply({ components: [], content: "Время ожидания ответа на запрос истекло" });
            setTimeout(async () => {
                await message_c.delete()
            }, 60000)
        });

        this.collector.on("collect", async (interaction) => {
            await this.handleInteraction(interaction);
        })

    };

    async generateMainMenu() {
        const embeds = [
            new EmbedBuilder().setTitle(`Словарь ${this.dictionary.language}`).setFooter({ text: "Версия бота: 0.1.0-dev", iconURL: this.interaction.client.user.displayAvatarURL() }).setTimestamp().setAuthor({ name: this.interaction.user.username, iconURL: this.interaction.user.displayAvatarURL() }).setURL("https://discord.com").setDescription(`В этом словаре ${this.dictionary.sets.length} наборов, в них сохранено ${this.dictionary.flashcards.length} слов`).addFields(
                ...this.dictionary.folders.map((folder) => {
                    return {
                        name: `${folder.name} (${folder.sets.length} наборов)`,
                        value: `${this.dictionary.sets.filter(set => set.folder === folder.id).map((set, i) => `${i}. **${set.name}** (${set.flashcards.length} слов.)`).join(", ")}`
                    }
                })
            )
        ];

        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('sets:').setLabel('Наборы').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('language:').setLabel('Язык').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('filter:').setLabel('Фильтры').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('interactive:').setLabel('Интерактив').setDisabled(true).setStyle(ButtonStyle.Primary),
            ),
        ];

        return { embeds, components };
    };

    async handleInteraction(interaction: ButtonInteraction) {
        // await defer(interaction);

        const [chapter, feature, data] = interaction.customId.split(':');
        console.table([{ chapter: chapter }, { feature: feature }, { data: data }])

        switch (chapter as "sets" | "language" | "filter" | "interactive") {
            case "sets": {
                await defer(interaction);

                switch (feature as "previous" | "next" | "page") {
                    case "page":

                        break;
                    case "previous":
                    case "next": {
                        const page = Number(data);
                        const output = this.setsPaginationUtil(page);
                        await interaction.editReply(output)
                        break;
                    };
                    default: {
                        await interaction.editReply(this.setsPaginationUtil(1))
                        break;
                    }
                }
                break;
            }
            case "language": {
                break;
            }
            case "filter": {
                break;
            }
            case "interactive": {
                break;
            }
        }

    }

    setsPaginationUtil(page: number, max: number = 23) {
        const pages = Math.ceil(this.dictionary.sets.filter(set => this.dictionary.folders.find(folder => folder.id === set.folder)?.language === this.dictionary?.language).length / max);
        const components = [];
        let row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(
            new ButtonBuilder().setCustomId(`sets:previous:${page - 1}`).setStyle(ButtonStyle.Primary).setDisabled(page === 1).setLabel("<"),
        )

        for (let i = 1, iSum = 0; iSum + i <= max; i++) {
            const setNumber = (iSum + i) + (page - 1) * max;
            if (i === page) {
                row.addComponents(
                    new ButtonBuilder().setCustomId(`sets:page:${setNumber}`).setStyle(setNumber === page ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(setNumber === page).setLabel(`${setNumber}`)
                )
            };

            if (row.components.length === 5) {
                components.push(row);
                iSum += i;
                i = 0;
                row = new ActionRowBuilder<ButtonBuilder>()
            };

        };


        row.addComponents(
            new ButtonBuilder().setCustomId(`sets:next:${page + 1}`).setStyle(ButtonStyle.Primary).setDisabled(page >= pages).setLabel(">"),
        );
        components.push(row);

        const embeds = [
            new EmbedBuilder().setFooter({ text: `Всего найдено наборов ${this.dictionary.sets.length} | Страница ${page} из ${pages}` }).setTimestamp()
        ];

        const indexes: { index: number, set: Set }[] = [];

        embeds[0].setDescription(this.dictionary.sets.slice(max * (page - 1), max * page).map((set, index) => {
            indexes.push({ index, set });
            return `${index + 1}. **${set?.name || "Нет имени (баг)"}** *(${set.flashcards.length} слов)* \`${set.id.split("-")[0]}\``
        }).join("\n") + `\n\n__**Временно вы не можете выбирать набор из этого списка, поэтому здесь и указаны айди наборов - начните вводить его в команде </set:1391353212287717519> и просмотрите его**__`);

        return { embeds, components, indexes };
    }
}