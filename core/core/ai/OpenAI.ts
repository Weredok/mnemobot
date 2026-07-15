import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.openai
});

export { client as OpenAIClient}