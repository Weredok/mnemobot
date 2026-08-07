export function getAiRequestOptions(modelId: string) {
  let temperature = 0.05;
  let maxTokens = 300;

  if (modelId.includes(':free') || modelId.includes('small') || modelId.includes('mini')) {
    temperature = 0.2; 
    maxTokens = 2000; 
  }

  return { temperature, maxTokens };
}