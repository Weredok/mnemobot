import { renewal } from "core/ai/Renewal.ts";
import { CEFR, Preferences, Flashcard, Spawn, User, Notification, NotificationType } from "database";

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
  await prefs.init(dev);
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

  const notification = new Notification();
  notification.type = NotificationType.ReviewTime;
  notification.data = {
    userId: dev.id,
    message: "test notfy",
    alwaysUpdate: false,
    updatedNow: false,
  };

  await notification.save();

  const spawn = new Spawn();
  spawn.uuid = notification.uuid
  spawn.at = Date.now();
  spawn.during = 1000 * 60 * 60 * 6;
  spawn.flashcardIds = [];
  spawn.platform = "discord";
  spawn.userId = dev.id;
  await spawn.initialize()
  await spawn.save();
  await spawn.ask();