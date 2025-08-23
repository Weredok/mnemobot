import { SlashCommandStringOption } from "discord.js";
import { client } from "./index.ts";
import { Dictionary } from "core";
import { CEFR, User } from "database";
import { renewal } from "core/ai/Renewal.ts";

client.once("ready", async () => {

    const dictionary = new Dictionary();
    dictionary.userId = 0;
    dictionary.language = {
        source: "Russian",
        target: "English",
        name: "Russian - English"
    }
    dictionary.folders = [];
    dictionary.sets = [];
    dictionary.flashcards = [];
    dictionary.folderIds = [];
    dictionary.setIds = [];
    dictionary.flashcardIds = [];


    // await dictionary.save();

    const dictionaries = await Dictionary.findBy({ userId: 0 });
    console.log(dictionaries)

    const developer = new User();
    developer.awcTime = 7500;
    developer.id = 0;
    developer.languages = ["Russian", "English"];
    developer.sessions = [];
    developer.sets = [];
    developer.wordsTotal = 0;
    developer.telegramIDs = [];
    developer.discordIDS = "1276300934141579305"
    developer.aiModelSelecting = {}
    developer.aiRestrictions = []
    developer.aiUsing = []
    developer.knowing = {
        "Russian": CEFR.C2,
        "English": CEFR.B2
    }


    // await developer.save();
    await User.find()

    const commands = [
        {
            name: "start",
            description: "test"
        }, {
            name: "dictionary",
            description: "test"
        }, {
            name: "set",
            description: "test",
            options: [
                new SlashCommandStringOption().setAutocomplete(true).setName("set").setDescription("test").setRequired(true)
            ]
        }
    ];

    // @ts-ignore
    await client.application?.commands.set(commands);

   await renewal(0, {
        notice: "dev tests",
        timestamp: Date.now(),
        time: 9e90,
        renewal: 9e90,
        model: "gpt-4o-mini",
        output: 9e90,
        input: 9e90
    })
});