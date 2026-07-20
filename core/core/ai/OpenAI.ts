import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.openai,
  baseURL: process.env.api,
});

export { client as OpenAIClient}