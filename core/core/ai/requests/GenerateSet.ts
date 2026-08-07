import { CEFR, Set, User } from "database";
import { OpenAIClient } from "../OpenAI.ts";
import fs from "node:fs";
import { Flashcard } from "database";
import { getCurrentQuota } from "../Renewal.ts";
import { ModelUpdaterWorker } from "../../jobs/AvailableAiModels.ts";

async function generateSet(source: string, target: string, cefr: CEFR, topic: string, count: number, userId: number, functions: Array<((any?) => (any | Promise<any>))>, args: Array<any>): Promise<Flashcard[]> {

    const user = await User.findOneBy({ id: userId });
    const quota = await getCurrentQuota(userId, ModelUpdaterWorker.generate_word_set.name);

    if(!quota) return undefined;
    await functions[0](args[0]);

    const response = await OpenAIClient.responses.create({
        model: ModelUpdaterWorker.generate_word_set.id,
        instructions: `
You're a professional bilingual lexicographer and concise translator. Your task is to generate vocabulary sets between a given source language and target language.

Rules: 
- Always return valid JSON only. Schema: { "terms": string\[], "translations": string\[], "synonyms": string\[]\[] }
- terms is source words/phrases
- translations - primary translations, index-aligned with terms
- do not include distant, archaic, generic, or stylistically inappropriate words
- Always generate exactly the number of vocabulary terms requested by the user. If the request is unclear about this, assume 35 terms by default
- all generated terms must belong to the single topic domain explicitly specified by the user
- do not include word that are obvious cognates, direct translation from source to target language, or widely known internationally borrowings that do not require active learning. Avoid terms whose meaning can be easily interffered from the root or a simple prefix/suffix.
- focus on words that require the learner to understand vocabulary in context, not just guess from similarity. Synonyms must also follow this rule
- all generated terms must correspond to the CEFR level specified by the user A1-C1. Only include vocabulary appropriate for that level and higher. By the level, use words that user will not known at his level of knowing words
- synonyms - array of arrays, each sub-array contains only synonyms that are very-very closely related in meaning of translation and it's relevant to the specified topic
- No extra text, markup, or formatting. Only the JSON object.`,
        input: JSON.stringify({
            source,
            target,
            cefr,
            topic,
            count,
        }),
        temperature: 0.7,
        max_output_tokens: 3000,
    });

    await functions[1](args[1]);

    const responses: { terms: string[], translations: string[], synonyms: string[][] } = JSON.parse(response.output_text);

    const flashcards: Flashcard[] = [];

    for (let i = 0; i < responses.terms.length; i++) {
        const flashcard = new Flashcard();
        flashcard.front = [responses.terms[i]];
        flashcard.back = [responses.translations[i], ...responses.synonyms[i]];
        flashcard.strength = 0;
        flashcard.quality = [];
        flashcard.reviewCount = 0;
        flashcard.intervalReviewCount = 0;
        flashcard.lastReviewed = 0;
        flashcard.halfLifeHours = 0;
        flashcard.createdAt = Date.now();
        flashcard.user = userId;
        flashcards.push(flashcard);
    };

    return flashcards
};

