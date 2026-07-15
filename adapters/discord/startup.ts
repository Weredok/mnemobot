import { SlashCommandStringOption } from "discord.js";
import { DiscordClient as client } from "./index.ts";
import { Dictionary } from "core";
import { CEFR, Flashcard, Preferences, User } from "database";
import { renewal } from "core/ai/Renewal.ts";

client.once("ready", async () => {
  const users = await User.find();
  users.forEach(async(user) => {
    if(user.lastAwaited){
      user.lastAwaited = 0;
      await user.save();
    }
  })
 
});
