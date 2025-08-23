import { GeneratorBase, GeneratorBasePropertiesDataStatus, type GeneratorBaseProperties } from "./Basic.ts";

interface FreeDictionaryAPIDevResponse {
    word: string;
    phonetic?: string;
    origin?: string;
    phonetics: {
        text?: string;
        audio?: string;
    }[];
    meanings: {
        partOfSpeech: string;
        definitions: {
            definition: string;
            example?: string;
            synonyms: string[];
            antonyms: string[];
        }[];
    }[];
};


export class FreeDictionaryAPIDev extends GeneratorBase {
    response: FreeDictionaryAPIDevResponse;
    constructor(properties: GeneratorBaseProperties, config: { [key: string]: any }) {
        properties.supportedLanguages = ["en"];
        properties.target = "en";
        properties.verification = true;

        super(properties, config);
    };

    async verify(){
        // to-do
    }
    async request() {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${this.properties.source}`);
        this.properties.data.status = GeneratorBasePropertiesDataStatus.Requested;

        if (response.status === 200) {
            this.response = await response.json() as FreeDictionaryAPIDevResponse;
            this.properties.data.status = GeneratorBasePropertiesDataStatus.Generated;
        } else {
            this.properties.data = {
                status: response.status === 404 ? GeneratorBasePropertiesDataStatus.NotFound : GeneratorBasePropertiesDataStatus.Failed,
                error_message: response.statusText,
                error_code: response.status
            }
        }

    }
}