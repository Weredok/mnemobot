import { Flashcard } from "database";
import { Dictionary } from "../functions/Dictionary.ts";
import { randomUUID } from "crypto";
import { logger } from "../Logger.ts";

export class WordService {
    word: Flashcard;
    dictionary: Dictionary;
    id: string;

    constructor(word: Flashcard, dictionary: Dictionary, id?: string) {
        this.id = id || randomUUID();
        this.word = word;
        this.dictionary = dictionary;
    };

    async syncronize() {
        this.word = await Flashcard.findOneBy({ id: this.word.id });
        // this.dictionary.syncronize()
    };

    async enter(term: string[], translation: string[], set: string) {
        try {
            if (!this.dictionary) logger.error(`Dictionary for ${this.id} is not defined`);

            await this.dictionary.addWord(term, translation, set);
            return true
        } catch (error) {
            logger.error(error);
            return false
        }
    };

}