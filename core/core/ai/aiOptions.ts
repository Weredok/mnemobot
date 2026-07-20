import { BotAiTargets } from "./const.ts";

export function getAiRequestOptions(modelId: string, target: string) {
  let temperature = 0.05;
  let maxTokens = 300;

  if (modelId.includes(':free') || modelId.includes('small') || modelId.includes('mini')) {
    temperature = 0.2; 
    maxTokens = 2000; 
  }

  if (target === BotAiTargets.GENERATE_WORD_SET) {
    temperature = 0.7;
    maxTokens = 800;
  }

  return { temperature, maxTokens };
}