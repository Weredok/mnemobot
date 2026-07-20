/**
 * @fileoverview This class will be used to handle word interactions like add, edit or delete.
 */

import { detectLanguages, Dictionary, OpenAIClient } from "core";
import { DeveloperSelectedAiTargets } from "core/ai/Readme.ts";
import { getCurrentQuota } from "core/ai/Renewal.ts";
import { Flashcard, Preferences, User } from "database";
import { text } from "../../languages/index.ts";
import fs from "fs";
import { getAiRequestOptions } from "core/ai/aiOptions.ts";
import { BotAiTargets } from "core/ai/const.ts";
import { EmbedBuilder } from "discord.js";
import { DiscordClient } from "discord";

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
  Text = "TEXT",
  File = "FILE",
}

export enum InputQuantity {
  Single = "SINGLE",
  Batch = "BATCH",
}

/**
 * Describes the state of this word interaction. This is a key Enum, which will tell Dispatcher whether to call API/GPT or write to DB directly.
 */
export enum TranslationState {
  Complete = "COMPLETE",
  Incomplete = "INCOMPLETE",
  Mixed = "MIXED",
}

export class WordInteraction {
  user: User;
  preferences: Preferences;
  languageCode: string;
  dictionary: Dictionary;
  flashcards_created: Flashcard[];
  enter: EnterWordInteraction;
  private sourceLanguage: string;
  private targetLanguage: string;

  constructor(
    user: User,
    preferences: Preferences,
    languageCode: string,
    enter?: EnterWordInteraction,
    flashcards_created?: Flashcard[],
    dictionary?: Dictionary,
  ) {
    this.user = user;
    this.preferences = preferences;
    this.languageCode = languageCode;
    this.dictionary = dictionary;
    this.flashcards_created = flashcards_created || [];
    this.enter = enter;
  }

  // Function for synchronizing dictionary
  async syncronize(
    executionAfterSuccess?: (any?) => void | Promise<void>,
    executionAfterData?: any,
  ) {
    if (!this.dictionary) {
      this.dictionary = new Dictionary({
        user: this.user,
        preferences: this.preferences,
        userId: this.user.id,
        language: {
          source: this.sourceLanguage,
          target: this.targetLanguage,
        },
        folderIds: [],
        setIds: [],
        flashcardIds: [],
        folders: [],
        sets: [],
        flashcards: [],
      });
    }

    await this.dictionary.syncronize();
    if (executionAfterSuccess)
      executionAfterData
        ? await executionAfterSuccess(executionAfterData)
        : await executionAfterSuccess();

    return;
  }

  /**
   * Identifying the type of word interaction
   */
  async identify(data: string) {
    // Initializing
    if (!this.enter) {
      this.enter = {
        method: InputMethod.Text,
        quantity: undefined,
        state: undefined,
      };
    }

    this.enter.quantity =
      data.split(this.preferences.splitters.ForProvidingBatchOfWords).length +
        data.split(this.preferences.splitters.ForProvidingBatchOfSentences)
          .length >
      1
        ? InputQuantity.Batch
        : InputQuantity.Single;

    const data_flashcards = {
      completed: {
        sentences: [],
        words: [],
      },
      incomplete: {
        sentences: [],
        words: [],
      },
    };
    if (this.enter.quantity === InputQuantity.Batch) {
      // For identifying completed and incompleted flashcards in the batch
      data_flashcards.completed = {
        sentences: data
          .split(this.preferences.splitters.ForProvidingBatchOfSentences)
          .filter(
            (sentence) =>
              sentence.split(
                this.preferences.splitters.ForSingleWordWithProvidedTranslation,
              ).length > 1,
          ),
        words: data
          .split(this.preferences.splitters.ForProvidingBatchOfWords)
          .filter(
            (word) =>
              word.split(
                this.preferences.splitters.ForSingleWordWithProvidedTranslation,
              ).length > 1,
          ),
      };

      data_flashcards.incomplete = {
        words: data
          .split(this.preferences.splitters.ForProvidingBatchOfWords)
          .filter(
            (word) =>
              word.split(
                this.preferences.splitters.ForSingleWordWithProvidedTranslation,
              ).length === 1,
          ),
        sentences: data
          .split(this.preferences.splitters.ForProvidingBatchOfSentences)
          .filter(
            (sentence) =>
              sentence.split(
                this.preferences.splitters.ForSingleWordWithProvidedTranslation,
              ).length === 1,
          ),
      };
    } else if (this.enter.quantity === InputQuantity.Single) {
      if (
        data.split(
          this.preferences.splitters.ForSingleWordWithProvidedTranslation,
        ).length > 1
      ) {
        data_flashcards.completed = {
          sentences: [],
          words: [data],
        };
      } else {
        data_flashcards.incomplete = {
          sentences: [data],
          words: [],
        };
      }
    }

    if (
      data_flashcards.completed.words.length > 0 &&
      data_flashcards.incomplete.words.length > 0
    ) {
      this.enter.state = TranslationState.Mixed;
    } else if (data_flashcards.completed.words.length > 0) {
      this.enter.state = TranslationState.Complete;
    } else if (data_flashcards.incomplete.words.length > 0) {
      this.enter.state = TranslationState.Incomplete;
    }

    const detected = detectLanguages(data);
    this.sourceLanguage =
      detected.length > 0
        ? detected[0]
        : this.dictionary?.language?.source || this.languageCode;

    this.targetLanguage =
      this.dictionary?.language?.target ||
      this.user.languages[0] ||
      this.languageCode;

    if (this.sourceLanguage === this.targetLanguage) {
      this.targetLanguage =
        this.sourceLanguage === this.user.languages[1]
          ? this.user.languages[0]
          : this.user.languages[1];
    }

    return data_flashcards;
  }

  async executeInput(data: string) {
    await this.syncronize();
    await this.identify(data);

    const { splitters } = this.preferences;
    const result: Array<{
      front: string[];
      back: string[];
      examples?: string[];
    }> = [];

    const batchRegex = new RegExp(splitters.ForProvidingBatchOfWords);
    const sentenceRegex = new RegExp(splitters.ForProvidingBatchOfSentences);
    const translationRegex = new RegExp(
      `\\s*(${splitters.ForSingleWordWithProvidedTranslation})\\s*`,
    );

    const lines = data.split(batchRegex);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const sentences = line.split(sentenceRegex);

      for (let j = 0; j < sentences.length; j++) {
        const itemText = sentences[j].trim();
        if (!itemText) continue;

        const parts = itemText.split(translationRegex);

        if (parts.length > 1 && parts[1]) {
          const front = parts[0]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const back = parts[parts.length - 1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          result.push({ front, back });
        } else {
          const front = itemText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          result.push({ front, back: [] });
        }
      }
    }

    const flashcards: Flashcard[] = [];

    for (const item of result) {
      if (item.back.length === 0) {
        const { front, back, examples } = await this.askAI(
          item.front,
          this.user.knowing[this.dictionary.language.source],
          this.dictionary.language.source,
          this.dictionary.language.target,
        );
        console.log("🔍 AI RETURNED BACK:", back); // Что тут?
        item.back = back;
        item.examples = examples;
        item.front = front;
        console.log("🔍 ITEM.BACK BEFORE FLASHCARD:", item.back); // А тут?
      }

      const flashcard = new Flashcard();
      flashcard.front = item.front;
      flashcard.back = item.back;
      flashcard.examples = item.examples;
      flashcard.createdAt = Date.now();
      flashcard.quality = [];
      flashcard.user = this.user.id;
      console.log("🔍 FLASHCARD.BACK AFTER ASSIGN:", flashcard.back); // А что тут?


      await flashcard.save();
      this.dictionary.flashcards.push(flashcard);
      this.flashcards_created.push(flashcard);
      flashcards.push(flashcard);
    }

    await this.syncronize();
    return flashcards;
  }

  async askAI(
    data: string[],
    cefr: string = "B1",
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{ front: string[]; back: string[]; examples: string[] }> {
    const quota = await getCurrentQuota(
      this.user.id,
      BotAiTargets.TRANSLATE_AND_EXPAND,
    );

    if (!quota) {
      throw new Error(text("base_interaction.quota_end", this.languageCode));
    }

    const SELECTED_AI_MODEL = BotAiTargets.TRANSLATE_AND_EXPAND;
    const wordString = data.join(", ");

    const rq = `Translate from ${sourceLanguage} (${cefr}) to ${targetLanguage}. Target CEFR level: ${cefr}. Words/Sentences: ${wordString}.`;

    let datestamp = Date.now();

    const { temperature, maxTokens } = getAiRequestOptions(
      SELECTED_AI_MODEL,
      BotAiTargets.TRANSLATE_AND_EXPAND,
    );

    const response = await OpenAIClient.responses.create({
      model: SELECTED_AI_MODEL,
      instructions: fs.readFileSync("instructions/translator.txt", "utf-8"),
      input: rq,
      temperature: temperature,
      max_output_tokens: maxTokens,
    });

    console.log("[AI DEBUG] Raw Response:", response.output_text);

    try {
      const parsedAiResult = JSON.parse(response.output_text);
      console.log("[AI DEBUG] Parsed:", parsedAiResult);

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

      return {
        front: parsedAiResult.front || data,
        back: parsedAiResult.back || [],
        examples: parsedAiResult.examples || [],
      };
    } catch (e) {
      console.error("[AI ERROR] Failed to parse JSON:", e);
      return { front: data, back: ["AI_PARSE_ERROR"], examples: [] };
    }
  };

  builder(){
    const embeds: EmbedBuilder[] = [];

    this.flashcards_created.map((flashcard) => {
      embeds.push(
        new EmbedBuilder()
        .setDescription(
          `**${flashcard.front.join(", ")}**\n**${flashcard.back.join(", ")}**\n\n${flashcard.examples?.join("\n")}`
        )
      );
    });

    return { embeds };
  }
}
