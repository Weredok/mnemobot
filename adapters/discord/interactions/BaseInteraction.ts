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
        
            await this.dictionary.syncronize();
            if (executionAfterSuccess) executionAfterData ? await executionAfterSuccess(executionAfterData) : await executionAfterSuccess();

            return;
        
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