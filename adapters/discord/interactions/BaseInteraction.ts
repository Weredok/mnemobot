import { log } from "console";
import { detectLanguages, Dictionary, OpenAIClient } from "core";
import { DeveloperSelectedAiTargets } from "core/ai/Readme.ts";
import { getCurrentQuota } from "core/ai/Renewal.ts";
import { randomUUID } from "crypto";
import { Flashcard, User } from "database";
import { channel } from "diagnostics_channel";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, DMChannel, EmbedBuilder, ForumThreadChannel } from "discord.js";
import { ILike } from "typeorm";
import fs from "node:fs";


export class BaseInteraction {
    id: string;
    user: User;
    channel: DMChannel;
    dictionary?: Dictionary;

    constructor(user: User, channel: DMChannel, dictionary?: Dictionary) {
        this.id = randomUUID();
        this.user = user;
        this.channel = channel;
        this.dictionary = dictionary
        console.log(this.user.id + `e`)
    };

    async syncronize(executionAfterSuccess?: (any?) => (void | Promise<void>), executionAfterData?: any) {
        if (!this.dictionary) {
            const embeds = [new EmbedBuilder().setAuthor({ name: this.channel.client.user.username, iconURL: this.channel.client.user.displayAvatarURL() }).setTitle("Выберите словарь, с которым хотите взаимодействовать")];
            const components = [];

            const dictionaries = await Dictionary.findBy({ userId: this.user.id });
            dictionaries.forEach(async dictionary => { await dictionary.syncronize() });
            console.log(dictionaries.map(dictionary => console.log(dictionary.id)))


            let row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(`language:create:noneed`).setLabel("Создать").setStyle(ButtonStyle.Primary)
            );

            for (let i = 0; i < dictionaries.length; i++) {

                row.addComponents(
                    new ButtonBuilder().setCustomId(`e` + dictionaries[i]?.id).setLabel(dictionaries[i].language.name).setStyle(ButtonStyle.Success)
                );
                embeds[0].addFields({
                    name: dictionaries[i].language.name,
                    value: `Словарь на n (в будущем доделаю) слов`
                })
                if (row.components.length === 5 || i === dictionaries.length - 1) {
                    components.push(row);
                    row = new ActionRowBuilder<ButtonBuilder>();
                }
            };

            // components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            //     new ButtonBuilder().setCustomId(`ew` + dictionaries[i]?.id).setLabel(dictionaries[i].language.name).setStyle(ButtonStyle.Primary)
            // ));
            // embeds[0].setDescription(embeds[0].data.description + `\n${i}. ${dictionaries[i].language.name}`);


            const message = await this.channel.send({ embeds, components });
            const collector = message.createMessageComponentCollector({ time: this.dictionary.preferences.idleTimeout });

            collector.once("collect", async (interaction) => {
                await interaction.message.delete();
                this.dictionary = await Dictionary.findOneBy({ userId: this.user.id, language: { source: ILike(this.user.languages[interaction.customId.split(":")[1]]) } });
                this.dictionary.language.source = this.user.languages[interaction.customId.split(":")[1]];
                await this.dictionary.syncronize();
                if (executionAfterSuccess) executionAfterData ? await executionAfterSuccess(executionAfterData) : await executionAfterSuccess();

                await message.delete();
                return this.dictionary
            });

            collector.once("end", async () => {
                await message.delete();
            });

            return;
        } else {
            await this.dictionary.syncronize();
            if (executionAfterSuccess) executionAfterData ? await executionAfterSuccess(executionAfterData) : await executionAfterSuccess();

            return;
        }
    };

    async enterRequest(data: string | string[], ai: boolean = true) {
        this.user.lastAwaited = 0;
        await this.user.save();
        if (ai && typeof data === "string") {
            const quota = await getCurrentQuota(this.user.id, DeveloperSelectedAiTargets[1]);
            const isSourceLanguage = detectLanguages(data).includes(this.dictionary.language.source.slice(0, 2).toLowerCase());

            if (quota) {
                const rq = `From ${isSourceLanguage ? this.dictionary.language.source : this.dictionary.language.target} (${this.user.knowing[isSourceLanguage ? this.dictionary.language.source : this.dictionary.language.target] || "B1"}) to ${isSourceLanguage ? this.dictionary.language.target : this.dictionary.language.source} (${this.user.knowing[isSourceLanguage ? this.dictionary.language.target : this.dictionary.language.source] || "B1"}). Word: ${data}.`
                let datestamp = Date.now();
                const response = await OpenAIClient.responses.create({
                    model: "gpt-4o-mini-2024-07-18",
                    instructions: fs.readFileSync("../../instructions/translator.txt", "utf-8"),
                    input: data,
                    temperature: 0.05,
                    max_output_tokens: 200,
                })

                this.user.aiUsing.push({
                    timestamp: Date.now(),
                    usage: {
                        input: response.usage.input_tokens,
                        output: response.usage.output_tokens,
                    },
                    model: response.model,
                    output_text: response.output_text,
                    input_text: rq,
                    ping: Date.now() - datestamp
                });

                console.log(this.user.aiUsing)
                await this.user.save();


                const { terms, translations }: { terms: string[], translations: string[] } = JSON.parse(response.output_text);

                const flashcard = new Flashcard();
                flashcard.front = terms
                flashcard.back = translations;
                flashcard.createdAt = Date.now();
                flashcard.quality = [];
                flashcard.user = this.user.id;
                await flashcard.save();
                this.dictionary.flashcards.push(flashcard);
                await this.dictionary.syncronize();
                return flashcard


            } else {
                return "У вас нет квот для использования функций ИИ. Свяжитесь с разработчиком для получения новой.";
            }

        } else {

            const termsIsSourceLang = detectLanguages(data[0]).includes(this.dictionary.language.source.slice(0, 2).toLowerCase());

            console.log(termsIsSourceLang, data)
            const terms = data[termsIsSourceLang ? 0 : 1].split(", ");
            const translations = data[termsIsSourceLang ? 1 : 0].split(", ");
            console.log(terms, translations)

            if (terms.length > 1 && translations.length > 1) {
                console.log("fls")

                const flashcards: Flashcard[] = [];
                for (let i = 1; i < terms.length; i++) {
                    const flashcard = new Flashcard();
                    flashcard.front = [terms[i]];
                    flashcard.back = [translations[i]];
                    flashcard.createdAt = Date.now();
                    flashcard.quality = [];
                    flashcard.user = this.user.id;
                    await flashcard.save();
                    this.dictionary.flashcards.push(flashcard);
                    await this.dictionary.syncronize();
                    flashcards.push(flashcard)
                };

                return flashcards
            } else {
                console.log("fl")
                const flashcard = new Flashcard();
                flashcard.front = [terms[0]];
                flashcard.back = [translations[0]];
                flashcard.createdAt = Date.now();
                flashcard.quality = [];
                flashcard.user = this.user.id;
                await flashcard.save();
                this.dictionary.flashcards.push(flashcard);
                await this.dictionary.syncronize();
                return flashcard
            }
        };
    }

    async log(systemMessage: string) {
        const channel = await this.channel.client.channels.fetch("1406670575161839616") as ForumThreadChannel;
        await channel.send(`[\`${this.id}\`]: ${systemMessage}]`)
    }
}