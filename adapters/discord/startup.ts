import { SlashCommandStringOption } from "discord.js";
import { DiscordClient as client } from "./index.ts";
import { Dictionary } from "core";
import { CEFR, Preferences, User } from "database";
import { renewal } from "core/ai/Renewal.ts";

client.once("ready", async () => {
  

  const commands = [
    {
      name: "start",
      description: "test",
    },
    {
      name: "set",
      description: "test",
      options: [
        new SlashCommandStringOption()
          .setAutocomplete(true)
          .setName("set")
          .setDescription("test")
          .setRequired(true),
      ],
    },
  ];

  // @ts-ignore
  await client.application?.commands.set(commands);
  const dev = new User();
  dev.telegramIDs = [8097145027];
  dev.discordIDS = "1276300934141579305";
  dev.sessions = [];
  dev.sets = [];
  dev.wordsTotal = 0;
  dev.languages = ["Russian", "English"];
  dev.knowing = { Russian: CEFR.A1, English: CEFR.A1 };
  dev.aiUsing = [];
  dev.aiRestrictions = [];
  await dev.save();

const prefs = new Preferences();
await prefs.init(dev)
await prefs.save();

  await renewal(1, {
    notice: "dev tests",
    timestamp: Date.now(),
    time: 9e90,
    renewal: 9e90,
    model: "gpt-4o-mini",
    output: 9e90,
    input: 9e90,
  });
});
