import "./setup.ts";
import { GlobalWorker } from "core/jobs/GlobalWorker.ts";
import { renewal } from "core/ai/Renewal.ts";
import { CEFR, datasource, Flashcard, Preferences, Set, User } from "database";
import { DiscordClient } from "discord";
import { SlashCommandBuilder } from "discord.js";
import { TelegramClient } from "telegram";
const users = await User.find();
users.forEach(async (user) => {
  if (user.lastAwaited) {
    user.lastAwaited = 0;
    await user.save();
  }
});

if (process.env.stage === "dev") {
  const commands = [
    new SlashCommandBuilder().setName("start").setDescription("Main menu"),
  ];

  await DiscordClient.application.commands.set(commands);
  const dev = new User();
  dev.telegramIDs = [8097145027, 8146987863];
  dev.discordIDS = "1276300934141579305";
  dev.sessions = [];
  dev.name = "nxdreaming (developer account)";
  dev.sets = [];
  dev.wordsTotal = 0;
  dev.languages = ["uk", "en", "de"];
  dev.knowing = { uk: CEFR.C2, en: CEFR.B1, de: CEFR.A1 };
  dev.aiUsing = [];
  dev.aiRestrictions = [];
  await dev.save();

  const prefs = new Preferences();
  await prefs.init(dev);
  prefs.interfaceLanguage = "en";
  prefs.account = "8146987863";
  prefs.platform = "telegram"
    await prefs.save();

  await renewal(dev.id, {
    notice: "dev tests",
    timestamp: Date.now(),
    time: 9e90,
    renewal: 9e90,
    model: "gpt-4o-mini",
    output: 9e90,
    input: 9e90,
  });

  const fronts = ["test", "testify", "very testifyed"];
  const backs = ["mega test", "ultra test", "ahuet kakoi test"];
  const strengths = [1, 0.5, 0, 77];

  for (let i = 0; i < fronts.length; i++) {
    const flashcard = new Flashcard();
    flashcard.front = [fronts[i]];
    flashcard.back = [backs[i]];
    flashcard.strength = strengths[i];
    flashcard.quality = [5];
    flashcard.user = dev.id;
    await flashcard.save();
  }

  const flashcards = await Flashcard.find();
  const sets = await Set.find();
  const users = await User.find();

  for (const f of flashcards) {
    console.log(`[database]: Initialized ${f.id} (${f.front} - ${f.back})`);
  }

  for (const s of sets) {
    console.log(`[database]: Initialized ${s.id} (${s.name})`);
  }

  for (const u of users) {
    console.log(`[database]: Initialized ${u.id} (${u.name})`);
  }
}

console.log(
  `[discord]: Logged in as ${DiscordClient.user.username}#${DiscordClient.user.discriminator}`,
);
console.log(`[telegram]: Logged in as ${TelegramClient.bot.username}`);
console.log(
  `[database:${datasource.options.type}]: Database ${(await datasource.query("SELECT current_database();"))[0].current_database} connected`,
);


GlobalWorker.start().then(() => {
  console.log("[jobs]: Global worker started");
});