/**
 * @fileoverview Comprehensive registry of all AI targets/scenarios used across the mnemobot ecosystem.
 */

export const BotAiTargets = {
  /**
   * Primary learning loop: translating incomplete words, fetching synonyms, 
   * and generating context examples tailored to the user's CEFR level.
   */
  TRANSLATE_AND_EXPAND: 'translate_and_expand',

  /**
   * Verifying user-submitted flashcards for correctness, normalizing synonyms, 
   * and validating cards for potential inclusion in the global database.
   */
  VERIFY_FLASHCARD: 'verify_flashcard',

  /**
   * Generating creative, linguistically accurate, and thematic word sets 
   * (requires higher creativity/temperature).
   */
  GENERATE_WORD_SET: 'generate_word_set',

  /**
   * Processing performance metrics, user stats, and generating personalized 
   * lightweight motivation or feedback messages.
   */
  USER_MOTIVATION: 'user_motivation',

  /**
   * Automated daily/monthly system log aggregation and report generation 
   * for the Build-in-Public terminal channel (system logs).
   */
  SYSTEM_PUBLIC_REPORT: 'system_public_report',

  /**
   * Developer-side SMM helper utility for generating project release posts, 
   * changelog narratives, and interactive polls.
   */
  SMM_CONTENT_GENERATION: 'smm_content_generation'
} as const;

export type AiTargetType = typeof BotAiTargets[keyof typeof BotAiTargets];