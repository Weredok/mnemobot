import { CEFR, Set, User } from "database";
import { OpenAIClient } from "../OpenAI.ts";
import fs from "node:fs";
import { Flashcard } from "database";
import { getCurrentQuota } from "../Renewal.ts";
import { DeveloperSelectedAiTargets } from "../Readme.ts";

async function generateSet(source: string, target: string, cefr: CEFR, topic: string, count: number, userId: number, functions: Array<((any?) => (any | Promise<any>))>, args: Array<any>): Promise<Flashcard[]> {

    const user = await User.findOneBy({ id: userId });
    const quota = await getCurrentQuota(userId, DeveloperSelectedAiTargets[2]);

    if(!quota) return undefined;
    await functions[0](args[0]);

    const response = await OpenAIClient.responses.create({
        model: "gpt-4o",
        instructions: fs.readFileSync("../../instructions/generateSet.txt", "utf-8"),
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

