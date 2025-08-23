import { Flashcard, User } from "database";
import { BaseInteraction } from "./BaseInteraction.ts";
import { detectLanguages, Dictionary, OpenAIClient } from "core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, DMChannel, EmbedBuilder } from "discord.js";
import fs from "node:fs";
import { ILike } from "typeorm";
import OpenAI from "openai";
import { DeveloperSelectedAiTargets } from "core/ai/Readme.ts";
import { getCurrentQuota } from "core/ai/Renewal.ts";

export class WordInteraction extends BaseInteraction {
    word: Flashcard;


    constructor(user: User, channel: DMChannel, word?: Flashcard, dictionary?: Dictionary,) {
        super(user, channel, dictionary);
        this.word = word
    };

    async findDictionary(term: string) {
        const dictionaries = await Dictionary.findBy({ userId: this.user.id });
        console.log(dictionaries.map(d => console.log(d.id)), this.user.id)

        const dictionary = dictionaries.find(dictionary => {

            console.log([dictionary.language.source.slice(0, 2).toLowerCase(), dictionary.language.target.slice(0, 2).toLowerCase()], [dictionary.language.source, dictionary.language.target], detectLanguages(term), dictionary.language);
            return [dictionary.language.source.slice(0, 2).toLowerCase(), dictionary.language.target.slice(0, 2).toLowerCase()].some(lang => detectLanguages(term).includes(lang))
        });
        console.log(`search dict`, dictionary.id)

        if (dictionary) {
            await dictionary.syncronize();
            console.log(`search dict`)

            this.dictionary = dictionary;
            return dictionary;

        } else {
            await this.syncronize();
            return false;
        };

    }

    async enter(data: string) {
        const isWord = data.split(" ").length === 1;
        const dictionary = await this.findDictionary(data);
        const detectedLanguages = detectLanguages(data);
        const secondTranslateLanguage = [this.dictionary.language.source, this.dictionary.language.target].find(lang => !detectedLanguages.includes(lang.slice(0, 2).toLowerCase()));

        if (dictionary) {
            const embeds = [new EmbedBuilder().setAuthor({ name: this.channel.client.user.username, iconURL: this.channel.client.user.displayAvatarURL() }).setTitle(`Внесение ${isWord ? "слов(a)" : "фраз(ы)"} в словарь ${dictionary.language.name}...`).setDescription(`Ожидаю перевод на ${secondTranslateLanguage} в течении следующих ${this.dictionary.preferences.idleTimeout / 1000} секунд или перевод от ChatGPT...`)];
            const components = [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("ai:translate").setLabel("Перевод от ИИ").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("cancel_ew").setStyle(ButtonStyle.Danger).setLabel("Отменить")
                )
            ];

            const message = (await this.channel.send({ embeds, components }))
            const collector = message.createMessageComponentCollector({ time: this.dictionary.preferences.idleTimeout, max: 1 });
            this.user.lastAwaited = Date.now();
            await this.user.save();

            await this.channel.awaitMessages({ time: this.dictionary.preferences.idleTimeout, filter: (message) => message.author.id === this.user.discordIDS, max: 1 }).then(async (messages) => {
                const msg = messages.first();
                const data_ = msg.content;
                const flashcard = await this.enterRequest([data, data_]);

                // Save/cancel
                //             this.user.lastAwaited = 0;
                // await this.user.save();

                if (typeof flashcard === "string") return;
                const isArray = Array.isArray(flashcard);
                const embeds = [
                    new EmbedBuilder().setColor("Blurple").setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() }).setURL("https://discord.com").setTitle(`Внесение слов(a) в словарь ${dictionary.language.name}`).setDescription(`Вы перевели слов(o/a) *${!isArray ? flashcard.front[0] : flashcard.map(flashcard => flashcard.front[0]).join(", ")}* (предп. \`${detectLanguages(data).join(" или ")}\`) на \`${secondTranslateLanguage}\` как **__${!isArray ? flashcard.back[0] : flashcard.map(flashcard => flashcard.back[0]).join(", ")}__** ${(!isArray ? flashcard.back.length : flashcard.map(flashcard => flashcard.back.length).reduce((a, b) => a + b, 0)) > 1 ? `(*так же ${!isArray ? flashcard.back.slice(1, flashcard.back.length).join(", ") : flashcard.map(flashcard => flashcard.back.slice(1, flashcard.back.length).join(", ")).join(", ")}*)` : ""}\n\n`).setFooter({
                        text: msg
                            .client.user.username, iconURL: msg.client.user.displayAvatarURL()
                    }).setTimestamp()
                ];

                const components = [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId("selectset").setLabel("Сохранить").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("generateexamples").setLabel("Примеры").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("cancel_ew").setStyle(ButtonStyle.Secondary).setLabel("Отменить")
                    )
                ];

                await message.edit({ embeds, components });
            });



            collector.once("collect", async (interaction) => {
                console.log(interaction.customId)
                if (interaction.customId === "ai:translate") {

                    await interaction.deferUpdate();
                    const response = await this.enterRequest(data) as Flashcard;
                    if (response) {
                        const quota = await getCurrentQuota(this.user.id, DeveloperSelectedAiTargets[1]);
                        const lastQuotaUsage = this.user.aiUsing[this.user.aiUsing.length - 1];
                        const embeds = [
                            new EmbedBuilder().setColor("Blurple").setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() }).setURL("https://discord.com").setTitle(`Внесение слова в словарь ${dictionary.language.name}`).setDescription(`Искусственный интеллект перевёл слово *${data}* (предп. \`${detectLanguages(data).join(" или ")}\`) на \`${secondTranslateLanguage}\`. Прямым переводом является **__${response.back[0]}__** ${response.back.length > 1 ? `(*так же ${response.back.slice(1, response.back.length).join(", ")}*)` : ""}\n\n:ping_pong: Пинг: \`${lastQuotaUsage.ping}\`мс\n:bulb: Модель ИИ: \`${lastQuotaUsage.model}\`\nЗапрос: \`${lastQuotaUsage.input_text}\``).setFooter({ text: `Квота для этой модели: ${quota.input} (вход) / ${quota.output} (выход). Израсходовано ${lastQuotaUsage.usage.input} / ${lastQuotaUsage.usage.output} токенов`, iconURL: interaction.client.user.displayAvatarURL() }).setTimestamp()
                        ];

                        const components = [
                            new ActionRowBuilder<ButtonBuilder>().addComponents(
                                new ButtonBuilder().setCustomId("selectset").setLabel("Сохранить").setStyle(ButtonStyle.Primary),
                                new ButtonBuilder().setCustomId("generateexamples").setLabel("Примеры").setStyle(ButtonStyle.Primary),
                                new ButtonBuilder().setCustomId("cancel_ew").setStyle(ButtonStyle.Secondary).setLabel("Отменить")
                            )
                        ];

                        await interaction.editReply({ embeds, components });
                    } else {
                        await interaction.editReply("У вас нет квот для использования функций ИИ. Свяжитесь с разработчиком для получения новой.")
                    }


                } else if (interaction.customId === "cancel_ew") {
                    await interaction.message.delete();
                    return;
                }
            })


        } else {
            await this.syncronize(this.enter, data);

        }
    }
}