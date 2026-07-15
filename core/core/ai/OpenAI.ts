import OpenAI from 'openai';
import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config();


const client = new OpenAI({
  apiKey: "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", // This is the default and can be omitted
});

export { client as OpenAIClient}