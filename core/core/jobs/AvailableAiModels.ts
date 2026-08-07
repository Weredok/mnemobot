import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

interface AIModel {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  isFree: boolean;
  streak: number;
}

export class ModelUpdaterWorker {
  static default: AIModel;
  static global: Array<AIModel>;
  static free: Array<AIModel>;
  static paid: Array<AIModel>;

  // All AI targets in project. May be used in the future.

  /**
   * For simple translates and expanding with synonyms
   */
  static translate_and_expand: AIModel;

  /**
   * For verifying every flashcards in database that's real true or false info provided
   */
  static verify_flashcard: AIModel;

  /**
   * For generating a flashcards set's (can be compared with creative topics ai)
   */
  static generate_word_set: AIModel;

  /**
   * For writting notifications for users with their analytics info and motivation if needen
   */
  static user_motivation: AIModel;

  /**
   * For generation AI report about how system works by written analytics reports during period. If we have problems with it - AI must be notify about problematic periods
   */
  static system_public_report: AIModel;

  /**
   * For generating smm content (may not be used in tg channels, i promise it). Can be compared with system public report ai
   */
  static smm_content_generation: AIModel;

  /**
   * For examination experiment in the future
   */
  static examination: AIModel;

  /**
   * For creating and formulating some topics for generating sets
   */
  static creative_topics: AIModel;

  static async updateModels() {
    try {
      console.log("[ModelUpdater] Syncing models from OpenRouter API...");

      const response = await fetch(OPENROUTER_API_URL);
      if (!response.ok)
        throw new Error(
          `[ModelUpdater] Failed to fetch models: ${response.status}`,
        );

      const data = await response.json();
      const fetchedModels: any[] = data.data;

      const existingModels = Array.from(this.global);

      const newModelsList: AIModel[] = fetchedModels.map((m: any) => {
        const pricePrompt = parseFloat(m.pricing?.prompt || "0");
        const priceCompletion = parseFloat(m.pricing?.completion || "0");
        const isFree = pricePrompt === 0 && priceCompletion === 0;
        const provider = m.id.includes("/") ? m.id.split("/")[0] : "unknown";

        const existingModel = existingModels.find(
          (em: AIModel) => em.id === m.id,
        );
        const counter = existingModel ? existingModel.streak : 0;

        return {
          id: m.id,
          name: m.name,
          provider,
          context_length: m.context_length,
          pricing: {
            prompt: pricePrompt,
            completion: priceCompletion,
          },
          isFree,
          streak: counter + 1,
        };
      });

      this.global = newModelsList;
      this.free = newModelsList.filter((m) => m.isFree);
      this.paid = newModelsList.filter((m) => !m.isFree);

      console.log(
        `[ModelUpdater] Updated ${this.global.length} models in memory. Free models: ${this.free.length}`,
      );
    } catch (error) {
      console.error("[ModelUpdater] Error:", error);
    }

    await this.targetting();
  }

  static async targetting() {
    // selecting default ai model
    // in beta and alpha tests may be hardcoded
    this.default = this.free.filter(
      (m) => m.name === "inclusionai/ling-3.0-flash:free",
    )[0];

    this.creative_topics = this.default;
    this.translate_and_expand = this.default;
    this.verify_flashcard = this.default;
    this.generate_word_set = this.default;
    this.user_motivation = this.default;
    this.system_public_report = this.default;
    this.smm_content_generation = this.default;
    this.examination = this.default;
  }
}
