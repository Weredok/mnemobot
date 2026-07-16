/**
 * @fileoverview This class will be used to handle word interactions like add, edit or delete. 
 */

import { detectLanguages, Dictionary, OpenAIClient } from "core";
import { DeveloperSelectedAiTargets } from "core/ai/Readme.ts";
import { getCurrentQuota } from "core/ai/Renewal.ts";
import { Flashcard, User } from "database";
import { text } from "../../../core/languages/index.ts";
import fs from "fs"

/**
 * This enums will be used to identify the type of word typing. Suggested variants of use in chatbots is:
 * 1. Just providing a single word without translation with bot suggestion of translate this word via database, api or ai.
 * 2. Providing single word with translation, bot will just push this word to database. Example "hello - привет".
 * 3. Providing batch of words with translations, bot will push all words to database. Example "hello - привет, hi - привет".
 * 4. Providing mixed batch. Example "hello - привет, world".
 * 
 * Users can provide words in any of these variants:
 * 1. Type a single message to telegram/discord bots dm. Single - not more than 10 words for one flashcard, not more than 100 flashcard by message
 * 2. Send file to telegram/discord bots dm
 * 
 * Users can cancel action, if they did massloading of flashcards and want to cancel it.
 * 
 * Rules for AI verification of each flashcard in database is:
 * 1. Verify synonyms, if there are no synonyms then use the word as is. If yes then system needs to rebuild flashcards as synonyms.
 * 2. Verify card as is. If AI says that this flashcard is correct and we can verify it for other users in global database.
 * 
 * Splitters:
 * 1. " - " for single word with provided translations
 * 2. ", " for providing synonyms (source/target word pairs selects by " - " splitter)
 * 3. "\n" for providing batch of words
 * 4. "//" for providing examples
 * 5. ";" for providing batch of sentences (disables synonyms)
 * Examples: 
 * 1. "hello - привет" => single word with translation
 * 2. "hello - привет;hi - привет" => batch of words (or sentences) with translations 
 * 3. "hello - привет\nworld - мир" => batch of words with translations
 * 4. "hello world - привет мир // И он сказал: Привет мир! (And he said: Hello world!)" => single sentence with translation and example
 */

/**
 * Describes the method, quanity and state of this word interaction.
 */
export interface EnterWordInteraction {
  method: InputMethod;  
  quantity: InputQuantity;  
  state: TranslationState;   
}

export enum InputMethod {
  Text = 'TEXT',
  File = 'FILE',
}

export enum InputQuantity {
  Single = 'SINGLE', 
  Batch = 'BATCH'
}

/**
 * Describes the state of this word interaction. This is a key Enum, which will tell Dispatcher whether to call API/GPT or write to DB directly.
 */
export enum TranslationState {
  Complete = 'COMPLETE',
  Incomplete = 'INCOMPLETE',
  Mixed = 'MIXED'
}

export class WordInteraction {
    user: User;
    languageCode: string;
    dictionary: Dictionary;
    flashcard: Flashcard;
    enter: EnterWordInteraction;

    constructor(
      user: User,
      languageCode: string,
      enter?: EnterWordInteraction,
      flashcard?: Flashcard,
      dictionary?: Dictionary,
    ) {
      this.user = user;
      this.languageCode = languageCode;
      this.dictionary = dictionary;
      this.flashcard = flashcard;
      this.enter = enter;
    };

    // Function for synchronizing dictionary
    async syncronize(
    executionAfterSuccess?: (any?) => void | Promise<void>,
    executionAfterData?: any,
  ) {
    await this.dictionary.syncronize();
    if (executionAfterSuccess)
      executionAfterData
        ? await executionAfterSuccess(executionAfterData)
        : await executionAfterSuccess();

    return;
  };

  async enterRequest(
  data: string | string[],
  ai: boolean = true,
  flashcard?: Flashcard,
  ) {
    this.user.lastAwaited = 0;
    await this.user.save();
    if (ai && typeof data === "string") {
      const quota = await getCurrentQuota(
        this.user.id,
        DeveloperSelectedAiTargets[1],
      );
      const isSourceLanguage = detectLanguages(data).includes(
        this.dictionary.language.source.slice(0, 2).toLowerCase(),
      );

      if (quota) {
        const rq = `From ${isSourceLanguage ? this.dictionary.language.source : this.dictionary.language.target} (${this.user.knowing[isSourceLanguage ? this.dictionary.language.source : this.dictionary.language.target] || "B1"}) to ${isSourceLanguage ? this.dictionary.language.target : this.dictionary.language.source} (${this.user.knowing[isSourceLanguage ? this.dictionary.language.target : this.dictionary.language.source] || "B1"}). Word: ${data}.`;

        console.log(rq);
        let datestamp = Date.now();
        const response = await OpenAIClient.responses.create({
          model: "gpt-4o-mini-2024-07-18",
          instructions: fs.readFileSync("instructions/translator.txt", "utf-8"),
          input: rq,
          temperature: 0.05,
          max_output_tokens: 200,
        });

        this.user.aiUsing.push({
          timestamp: Date.now(),
          usage: {
            input: response.usage.input_tokens,
            output: response.usage.output_tokens,
          },
          model: response.model,
          output_text: response.output_text,
          input_text: rq,
          ping: Date.now() - datestamp,
        });

        await this.user.save();

        const {
          terms,
          translations,
        }: { terms: string[]; translations: string[] } = JSON.parse(
          response.output_text,
        );

        console.log(`enter request, ${flashcard?.id}`)
        if (!flashcard) {
          flashcard = new Flashcard();
        }
        flashcard.front = terms;
        flashcard.back = translations;
        flashcard.createdAt = Date.now();
        flashcard.quality = [];
        flashcard.user = this.user.id;
        await flashcard.save();
        this.dictionary.flashcards.push(flashcard);
        await this.dictionary.syncronize();
        return flashcard;
      } else {
        return text("base_interaction.quota_end", this.languageCode);
      }
    } else {
      let languages: string[] = [];
      for (let i = 0; i < data.length; i++) {
        languages.push(...detectLanguages(data[i]));
      }

      if (!languages.every((lg) => lg === languages[0])) {
        return text(
          "base_interaction.error_detection_languages",
          this.languageCode,
        );
      }

      const termsIsSourceLang = detectLanguages(data[0]).includes(
        this.dictionary.language.source.slice(0, 2).toLowerCase(),
      );

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
          flashcards.push(flashcard);
        }

        return flashcards;
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
        return flashcard;
      }
    }
  }

}