import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { text } from "../../languages/index.ts";
import { MenuHelper } from "./MenuHelper.ts";
import { DiscordClient } from "discord";
import { Flashcard } from "database";
import { InlineKeyboard } from "puregram";

export enum Location {
  Home = "main_menu.home",

  Settings = "main_menu.settings.title",
  ChangeUserInfo = "main_menu.settings.change_user_info",
  Preferences = "main_menu.settings.preferences",
  Quotes = "main_menu.settings.quotes",

  Dictionary = "main_menu.dictionary.title",
  ChangingKnowingLanguages = "main_menu.dictionary.change_knowing_languages",
  AddingNewLanguage = "main_menu.dictionary.add_new_language",
  ReadingAboutInteractionBot = "main_menu.dictionary.read_about_interaction_bot",

  History = "buttons_reference.history",

  Feedback = "buttons_reference.feedback",
  Spawn = "buttons_reference.spawn",

  Registration = "registration.title",
  RegistrationPreferences = "registration.pref_settings",

  CreateFolder = "create_folder.title",
  CreateSet = "create_set.title",
  CreateWord = "create_word.title",
  ReviewWord = "review_word.title",
}

export class StartMenu extends MenuHelper {
  current_location: Location;
  previous_location: Location;
  featured_location: Location;

  constructor({ user, userDataInitialization, platform }: MenuHelper) {
    super(user, userDataInitialization, platform);
    this.current_location = Location.Home;
    this.previous_location = Location.Home;
    this.featured_location = Location.Home;
  }

  async build() {
    await super.initialize();

    // Featuring next location
    switch (this.current_location) {
      case Location.Home:
        this.featured_location = Location.Feedback;
        break;
      case Location.Settings:
        this.featured_location = Location.Preferences;
        break;
      case Location.Dictionary:
        this.featured_location = Location.AddingNewLanguage;
        break;
    }

    switch (this.platform) {
      case "discord":
        const flashcard = await Flashcard.findBy({ user: this.user.id });
        const dbt_flashcards = flashcard.filter(
          (flashcard) =>
            flashcard.calculateStrength() <= this.preferences.percent,
        );

        const description = text(
          "main_menu.description",
          this.preferences.interfaceLanguage,
        )
          .replace("$count_languages", this.user.languages.length.toString())
          .replace("$count_word", flashcard.length.toString())
          .replace("$count_dbt_words", dbt_flashcards.length.toString());
        const embeds = [new EmbedBuilder()];
        embeds[0]
          .setColor("DarkButNotBlack")
          .setAuthor({
            name: `${text("main_menu.welcome", this.preferences.interfaceLanguage)} ${this.user.name}`,
            iconURL: DiscordClient.user.avatarURL(),
            url: "https://google.com",
          })
          .setFooter({
            iconURL: DiscordClient.user.avatarURL(),
            text: `${text("main_menu.bot_version", this.preferences.interfaceLanguage)} ${process.env.version} | ${text("main_menu.alpha_test.thanks", this.preferences.interfaceLanguage)}`,
          })
          .setTimestamp()
          .setDescription(description);
        const components = [new ActionRowBuilder<ButtonBuilder>()];
        components[0].addComponents(
          new ButtonBuilder()
            .setCustomId(Location.Settings)
            .setLabel(
              text(Location.Settings, this.preferences.interfaceLanguage),
            )
            .setStyle(
              Location.Settings === this.featured_location
                ? this.preferences.stylish
                  ? ButtonStyle.Primary
                  : ButtonStyle.Success
                : ButtonStyle.Secondary,
            ),
          new ButtonBuilder()
            .setCustomId(Location.Dictionary)
            .setLabel(
              text(Location.Dictionary, this.preferences.interfaceLanguage),
            )
            .setStyle(
              Location.Dictionary === this.featured_location
                ? this.preferences.stylish
                  ? ButtonStyle.Primary
                  : ButtonStyle.Success
                : ButtonStyle.Secondary,
            ),

          new ButtonBuilder()
            .setCustomId(Location.History)
            .setLabel(
              text(Location.History, this.preferences.interfaceLanguage),
            )
            .setStyle(
              Location.History === this.featured_location
                ? this.preferences.stylish
                  ? ButtonStyle.Primary
                  : ButtonStyle.Success
                : ButtonStyle.Secondary,
            ),
          new ButtonBuilder()
            .setCustomId(Location.Feedback)
            .setLabel(
              text(Location.Feedback, this.preferences.interfaceLanguage),
            )
            .setCustomId(Location.Feedback)
            .setStyle(
              Location.Feedback === this.featured_location
                ? this.preferences.stylish
                  ? ButtonStyle.Primary
                  : ButtonStyle.Success
                : ButtonStyle.Secondary,
            ),
          new ButtonBuilder()
            .setCustomId(Location.Spawn)
            .setLabel(text(Location.Spawn, this.preferences.interfaceLanguage))
            .setCustomId(Location.Spawn)
            .setStyle(
              Location.Spawn === this.featured_location
                ? this.preferences.stylish
                  ? ButtonStyle.Primary
                  : ButtonStyle.Success
                : ButtonStyle.Secondary,
            ),
        );
        return { embeds, components, content: "" };
        break;

      case "telegram":
        case "telegram": {
        const flashcardTg = await Flashcard.findBy({ user: this.user.id });
        const dbt_flashcardsTg = flashcardTg.filter(
          (flashcard) =>
            flashcard.calculateStrength() <= this.preferences.percent,
        );

        const descriptionTg = text(
          "main_menu.description",
          this.preferences.interfaceLanguage,
        )
          .replace("$count_languages", this.user.languages.length.toString())
          .replace("$count_word", flashcardTg.length.toString())
          .replace("$count_dbt_words", dbt_flashcardsTg.length.toString());

        const welcomeTg = text("main_menu.welcome", this.preferences.interfaceLanguage);
        const versionTg = text("main_menu.bot_version", this.preferences.interfaceLanguage);
        const thanksTg = text("main_menu.alpha_test.thanks", this.preferences.interfaceLanguage);

        const content = `<b>${welcomeTg} ${this.user.name}</b>\n\n${descriptionTg}\n\n<i>${versionTg} ${process.env.version} | ${thanksTg}</i>`;

        const replyMarkup = InlineKeyboard.keyboard([
          [
            InlineKeyboard.textButton({
              text: (Location.Settings === this.featured_location ? "🟢 " : "") + text(Location.Settings, this.preferences.interfaceLanguage),
              payload: Location.Settings,
            }),
            InlineKeyboard.textButton({
              text: (Location.Dictionary === this.featured_location ? "🟢 " : "") + text(Location.Dictionary, this.preferences.interfaceLanguage),
              payload: Location.Dictionary,
            }),
          ],
          [
            InlineKeyboard.textButton({
              text: (Location.History === this.featured_location ? "🟢 " : "") + text(Location.History, this.preferences.interfaceLanguage),
              payload: Location.History,
            }),
            InlineKeyboard.textButton({
              text: (Location.Feedback === this.featured_location ? "🟢 " : "") + text(Location.Feedback, this.preferences.interfaceLanguage),
              payload: Location.Feedback,
            }),
          ],
          [
            InlineKeyboard.textButton({
              text: (Location.Spawn === this.featured_location ? "🟢 " : "") + text(Location.Spawn, this.preferences.interfaceLanguage),
              payload: Location.Spawn,
            }),
          ],
        ]);

        // Возвращаем объект, который ваш обработчик сможет передать в context.send()
        return { content, replyMarkup, parse_mode: "HTML" };
      }
        break;

      default:
        console.error(
          "[database] (MenuHelper): Platform not found. Request aborted.",
        );
    }
  }
}
