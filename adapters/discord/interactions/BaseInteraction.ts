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
import { text } from "../../../core/languages/index.ts";

/**
 * Класс базового взаимодействия пользователя с словарём
 */
export class BaseInteraction {
    user: User;
    channel: DMChannel;
    dictionary?: Dictionary;
    languageCode: string

    constructor(user: User, languageCode: string, channel: DMChannel, dictionary?: Dictionary, ) {
        this.user = user;
        this.channel = channel;
        this.dictionary = dictionary
        this.languageCode = languageCode
    };

    /**
     * Функция для синхронизации словаря и последующего выполнения заданой функции с заданными параметром
     * Может дополняться, если синхронизировать надо что-то помимо словаря
     */
    async syncronize(executionAfterSuccess?: (any?) => (void | Promise<void>), executionAfterData?: any) {
        
            await this.dictionary.syncronize();
            if (executionAfterSuccess) executionAfterData ? await executionAfterSuccess(executionAfterData) : await executionAfterSuccess();

            return;
        
    };

    /**
     * Запрос к ИИ, будет вынесено из под адаптера в ядро проекта
     */
    async enterRequest(data: string | string[], ai: boolean = true) {
        this.user.lastAwaited = 0;
        await this.user.save();
        if (ai && typeof data === "string") {
            const quota = await getCurrentQuota(this.user.id, DeveloperSelectedAiTargets[1]);
            const isSourceLanguage = detectLanguages(data).includes(this.dictionary.language.source.slice(0, 2).toLowerCase());

            if (quota) {
                const rq = `From ${isSourceLanguage ? this.dictionary.language.source : this.dictionary.language.target} (${this.user.knowing[isSourceLanguage ? this.dictionary.language.source : this.dictionary.language.target] || "B1"}) to ${isSourceLanguage ? this.dictionary.language.target : this.dictionary.language.source} (${this.user.knowing[isSourceLanguage ? this.dictionary.language.target : this.dictionary.language.source] || "B1"}). Word: ${data}.`

                console.log(rq)
                let datestamp = Date.now();
                const response = await OpenAIClient.responses.create({
                    model: "gpt-4o-mini-2024-07-18",
                    instructions: fs.readFileSync("../../instructions/translator.txt", "utf-8"),
                    input: rq,
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
                return text("base_interaction.quota_end", this.languageCode);
            }

        } else {

            let languages: string[] = []
            for(let i = 0; i < data.length; i++) {
                languages.push(...detectLanguages(data[i]))
            };

            if(!languages.every(lg => lg === languages[0])) {
                return text("base_interaction.error_detection_language", this.languageCode);
            } 

            const termsIsSourceLang = detectLanguages(data[0]).includes(this.dictionary.language.source.slice(0, 2).toLowerCase());

            const terms = data[termsIsSourceLang ? 0 : 1].split(", ");
            const translations = data[termsIsSourceLang ? 1 : 0].split(", ");

            if (terms.length > 1 && translations.length > 1) {

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
        const channel = await this.channel.client.channels.fetch(process.env.log) as ForumThreadChannel;
        await channel.send(`${systemMessage}]`)
    }
}