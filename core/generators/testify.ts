import { FreeDictionaryAPIDev } from "./DictionaryAPI.ts";

const word = "work in bathroom";

const generator = new FreeDictionaryAPIDev({
    source: word,
    target: "ru",
    supportedLanguages: ["ru", "en"],
    user: "test",
    definition: "test",
    verification: true,
    data: {}
}, {});

await generator.request();

console.log(generator);