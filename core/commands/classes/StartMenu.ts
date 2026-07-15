import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { text } from "../../languages/index.ts";
import { MenuHelper } from "./MenuHelper.ts";
import { DiscordClient } from "discord";
import {
  ExpiryPolicy,
  Flashcard,
  Notification,
  NotificationType,
  Spawn,
} from "database";
import { InlineKeyboard } from "puregram";

export enum Location {
  Home = "main_menu.home",

  Settings = "main_menu.settings.title",
  ChangeUserInfo = "main_menu.settings.change_user_info_modal",
  Preferences = "main_menu.settings.preferences",
  Quotes = "main_menu.settings.quotes",
  ModifyAlgorithm = "main_menu.settings.modify_algorithm",

  Dictionary = "main_menu.dictionary.title",
  ChangingKnowingLanguages = "main_menu.dictionary.change_knowing_languages",
  AddingNewLanguage = "main_menu.dictionary.add_new_language",
  ReadingAboutInteractionBot = "main_menu.dictionary.read_about_interaction_bot",

  History = "buttons_reference.history",

  Feedback = "buttons_reference.feedback",

  Spawn = "buttons_reference.spawn",
  SpawnFilterQualityASC = "main_menu.spawn.quality_asc",
  SpawnFilterStrengthASC = "main_menu.spawn.strength_asc",
  SpawnFilterNewestFirst = "main_menu.spawn.newest_first",
  SpawnFilterOldestFirst = "main_menu.spawn.oldest_first",
  SpawnFilterReviewCount = "main_menu.spawn.review_count",
  SpawnFilterRandom = "main_menu.spawn.random",
  SpawnFilterConfirm = "main_menu.spawn.confirm",
  SpawnFilterConfirmByEnteringCount = "main_menu.spawn.confirm_by_entering_count",

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

  async locate(location: Location = Location.Home) {
    console.log(location);
    this.previous_location = this.current_location;
    this.current_location = location;

    let embeds: EmbedBuilder[] = [];
    let components: ActionRowBuilder<ButtonBuilder>[] = [];
    let content: string = "";
    switch (this.current_location) {
      case Location.Home:
        await super.initialize();
        const flashcard = await Flashcard.findBy({ user: this.user.id });
        const dbt_flashcards = flashcard.filter(
          (flashcard) =>
            flashcard.calculateStrength() <= this.preferences.percent,
        );

        switch (this.platform) {
          case "discord":
            const description = text(
              "main_menu.description",
              this.preferences.interfaceLanguage,
            )
              .replace(
                "$count_languages",
                this.user.languages.length.toString(),
              )
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
                .setLabel(
                  text(Location.Spawn, this.preferences.interfaceLanguage),
                )
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

          case "telegram": {
            const flashcardTg = await Flashcard.findBy({
              user: this.user.id,
            });
            const dbt_flashcardsTg = flashcardTg.filter(
              (flashcard) =>
                flashcard.calculateStrength() <= this.preferences.percent,
            );

            const descriptionTg = text(
              "main_menu.description",
              this.preferences.interfaceLanguage,
            )
              .replace(
                "$count_languages",
                this.user.languages.length.toString(),
              )
              .replace("$count_word", flashcardTg.length.toString())
              .replace("$count_dbt_words", dbt_flashcardsTg.length.toString());

            const welcomeTg = text(
              "main_menu.welcome",
              this.preferences.interfaceLanguage,
            );
            const versionTg = text(
              "main_menu.bot_version",
              this.preferences.interfaceLanguage,
            );
            const thanksTg = text(
              "main_menu.alpha_test.thanks",
              this.preferences.interfaceLanguage,
            );

            const content = `<b>${welcomeTg} ${this.user.name}</b>\n\n${descriptionTg}\n\n<i>${versionTg} ${process.env.version} | ${thanksTg}</i>`;

            const replyMarkup = InlineKeyboard.keyboard([
              [
                InlineKeyboard.textButton({
                  text:
                    (Location.Settings === this.featured_location
                      ? "🟢 "
                      : "") +
                    text(Location.Settings, this.preferences.interfaceLanguage),
                  payload: Location.Settings,
                }),
                InlineKeyboard.textButton({
                  text:
                    (Location.Dictionary === this.featured_location
                      ? "🟢 "
                      : "") +
                    text(
                      Location.Dictionary,
                      this.preferences.interfaceLanguage,
                    ),
                  payload: Location.Dictionary,
                }),
              ],
              [
                InlineKeyboard.textButton({
                  text:
                    (Location.History === this.featured_location ? "🟢 " : "") +
                    text(Location.History, this.preferences.interfaceLanguage),
                  payload: Location.History,
                }),
                InlineKeyboard.textButton({
                  text:
                    (Location.Feedback === this.featured_location
                      ? "🟢 "
                      : "") +
                    text(Location.Feedback, this.preferences.interfaceLanguage),
                  payload: Location.Feedback,
                }),
              ],
              [
                InlineKeyboard.textButton({
                  text:
                    (Location.Spawn === this.featured_location ? "🟢 " : "") +
                    text(Location.Spawn, this.preferences.interfaceLanguage),
                  payload: Location.Spawn,
                }),
              ],
            ]);

            return { content, replyMarkup, parse_mode: "HTML" };
          }

          default:
            console.error(
              "[database] (MenuHelper): Platform not found. Request aborted.",
            );
        }

        break;
      case Location.Settings:
        if (this.platform === "discord") {
          embeds = [
            new EmbedBuilder()
              .setAuthor({
                name: this.user.name,
                iconURL: DiscordClient.user.avatarURL(),
              })
              .setTitle(
                text(
                  "main_menu.settings.title",
                  this.preferences.interfaceLanguage,
                ),
              )
              .setDescription(
                text(
                  "main_menu.settings.description",
                  this.preferences.interfaceLanguage,
                )
                  .replace("$username", this.user.name)
                  .replace("$id", this.user.id.toString())
                  .replace(
                    "$quota_status",
                    this.user.aiRestrictions
                      .filter(
                        (q) =>
                          q.input > 0 &&
                          q.output > 0 &&
                          q.timestamp + q.time > Date.now(),
                      )
                      .length.toString().length > 0
                      ? "🟢"
                      : "🔴",
                  )
                  .replace("$anonymous", this.preferences.anonymous.toString()),
              ),
          ];

          components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("main_menu.settings.change_user_info_modal")
                .setStyle(ButtonStyle.Secondary)

                .setLabel(
                  text(
                    "main_menu.settings.change_user_info",
                    this.preferences.interfaceLanguage,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId("main_menu.settings.modify_algorithm")
                .setStyle(ButtonStyle.Secondary)
                .setLabel(
                  text(
                    "main_menu.settings.modify_algorithm",
                    this.preferences.interfaceLanguage,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId("main_menu.settings.preferences")
                .setStyle(ButtonStyle.Secondary)
                .setLabel(
                  text(
                    "main_menu.settings.preferences",
                    this.preferences.interfaceLanguage,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId("main_menu.settings.quotes")
                .setStyle(ButtonStyle.Secondary)
                .setLabel(
                  text(
                    "main_menu.settings.quotes",
                    this.preferences.interfaceLanguage,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId("main_menu.home")
                .setStyle(ButtonStyle.Success)
                .setLabel(
                  text("main_menu.home", this.preferences.interfaceLanguage),
                ),
            ),
          ];

          return { embeds, components, content: "" };
        } else if (this.platform === "telegram") {
          const replyMarkup = [
            InlineKeyboard.textButton({
              text:
                (Location.ChangeUserInfo === this.featured_location
                  ? "🟢 "
                  : "") +
                text(
                  Location.ChangeUserInfo,
                  this.preferences.interfaceLanguage,
                ),
              payload: Location.ChangeUserInfo,
            }),
            InlineKeyboard.textButton({
              text:
                (Location.Preferences === this.featured_location ? "🟢 " : "") +
                text(Location.Preferences, this.preferences.interfaceLanguage),
              payload: Location.Preferences,
            }),
            InlineKeyboard.textButton({
              text:
                (Location.Quotes === this.featured_location ? "🟢 " : "") +
                text(Location.Quotes, this.preferences.interfaceLanguage),
              payload: Location.Quotes,
            }),
            InlineKeyboard.textButton({
              text:
                (Location.ModifyAlgorithm === this.featured_location
                  ? "🟢 "
                  : "") +
                text(
                  Location.ModifyAlgorithm,
                  this.preferences.interfaceLanguage,
                ),
              payload: Location.ModifyAlgorithm,
            }),
            InlineKeyboard.textButton({
              text:
                (Location.Home === this.featured_location ? "🟢 " : "") +
                text(Location.Home, this.preferences.interfaceLanguage),
              payload: Location.Home,
            }),
          ];
          let content = text(
            "main_menu.settings.title",
            this.preferences.interfaceLanguage,
          );
          return {
            content,
            replyMarkup: InlineKeyboard.keyboard([replyMarkup]),
            parse_mode: "HTML",
          };
        }

      case Location.ChangeUserInfo:
        if (this.platform === "discord") {
          const modal = new ModalBuilder();
          modal.setTitle(
            text(
              "main_menu.settings.change_user_info",
              this.preferences.interfaceLanguage,
            ),
          );
          modal.setCustomId("main_menu.settings.change_user_info_modal");

          const name = new TextInputBuilder()
            .setCustomId("main_menu.settings.change_user_info_username")
            .setLabel(
              text(
                "main_menu.settings.change_user_info_username",
                this.preferences.interfaceLanguage,
              ),
            )
            .setValue(this.user.name)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const password = new TextInputBuilder()
            .setCustomId("main_menu.settings.change_user_info_password")
            .setValue(this.user.password)
            .setLabel(
              text(
                "main_menu.settings.change_user_info_password",
                this.preferences.interfaceLanguage,
              ),
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(name),
            new ActionRowBuilder<TextInputBuilder>().addComponents(password),
          );

          return {
            embeds: [],
            components: [],
            content: "",
            modal,
          };
        } else if (this.platform === "telegram") {
          return {
            content: text(
              "main_menu.settings.change_user_info_tgs",
              this.preferences.interfaceLanguage,
            ),
          };
        }
        break;

      case Location.Preferences:
        if (this.platform === "discord") {
          components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(
                  "main_menu.settings.preferences.select_interface_language",
                )
                .setStyle(ButtonStyle.Secondary)
                .setLabel(
                  text(
                    "main_menu.settings.preferences.select_interface_language",
                    this.preferences.interfaceLanguage,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId(
                  "main_menu.settings.preferences.review_options_master",
                )
                .setStyle(ButtonStyle.Secondary)
                .setLabel(
                  text(
                    "main_menu.settings.preferences.review_options_master",
                    this.preferences.interfaceLanguage,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId("main_menu.settings.preferences.enter_master")
                .setStyle(ButtonStyle.Secondary)
                .setLabel(
                  text(
                    "main_menu.settings.preferences.enter_master",
                    this.preferences.interfaceLanguage,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId("main_menu.settings.preferences.select_pa_master")
                .setStyle(ButtonStyle.Secondary)
                .setLabel(
                  text(
                    "main_menu.settings.preferences.select_pa_master",
                    this.preferences.interfaceLanguage,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId("main_menu.home")
                .setStyle(ButtonStyle.Success)
                .setLabel(
                  text("main_menu.home", this.preferences.interfaceLanguage),
                ),
            ),
          ];

          embeds = [
            new EmbedBuilder()
              .setTitle(
                text(
                  "main_menu.settings.preferences.title",
                  this.preferences.interfaceLanguage,
                ),
              )
              .addFields(
                {
                  name: text(
                    "main_menu.settings.preferences.langs_title",
                    this.preferences.interfaceLanguage,
                  ),
                  value: text(
                    "main_menu.settings.preferences.langs_value",
                    this.preferences.interfaceLanguage,
                  )
                    .replace(
                      "$interfaceLanguage",
                      this.preferences.interfaceLanguage,
                    )
                    .replace("$mainLanguage", this.preferences.language),
                  inline: true,
                },
                {
                  name: text(
                    "main_menu.settings.preferences.platform_and_account_title",
                    this.preferences.interfaceLanguage,
                  ),
                  inline: true,
                  value: text(
                    "main_menu.settings.preferences.platform_and_account_value",
                    this.preferences.interfaceLanguage,
                  )
                    .replace("$platform", this.preferences.platform)
                    .replace("$account", this.preferences.account)
                    .replace(
                      "$notifications",
                      String(this.preferences.notifications),
                    )
                    .replace(
                      "$recomendations",
                      String(this.preferences.recomendations),
                    ),
                },
                {
                  name: text(
                    "main_menu.settings.preferences.enter_master_title",
                    this.preferences.interfaceLanguage,
                  ),
                  inline: true,
                  value: text(
                    "main_menu.settings.preferences.enter_master_value",
                    this.preferences.interfaceLanguage,
                    /** // Тип ввода перевода
              enterringTranslateType: EnterManageOptions;
              // Генерация примера
              generateExampleType: EnterManageOptions;
              // Предпочитаемый язык ввода
              selectSourceLanguageType: EnterManageOptions;
              // Предпочитаемый язык-цель
              selectTargetLanguageType: EnterManageOptions;
              // Поведение автосохранения
              autoSave: boolean;
              // Искать ли перевод в глобальной базе данных перед тем, как делать автозапрос в ИИ
              searchGlobalBeforeAI: boolean;
              // Искать ли перевод в глобальной базе данных перед тем, как спрашивать пользователя мануальный перевод
              searchGlobalBeforeManual: boolean;
              // Модель для генерации ответов (настраивает разработчик)
              model: string;
              // Первый период для повторения
              firstIntervalReview: number; */
                  )
                    .replace(
                      "$enterringTranslateType",
                      String(this.preferences.enter.enterringTranslateType),
                    )
                    .replace(
                      "$generateExampleType",
                      String(this.preferences.enter.generateExampleType),
                    )
                    .replace(
                      "$selectSourceLanguageType",
                      String(this.preferences.enter.selectSourceLanguageType),
                    )
                    .replace(
                      "$selectTargetLanguageType",
                      String(this.preferences.enter.selectTargetLanguageType),
                    )
                    .replace(
                      "$autoSave",
                      String(this.preferences.enter.autoSave),
                    )
                    .replace(
                      "$searchGlobalBeforeAI",
                      String(this.preferences.enter.searchGlobalBeforeAI),
                    )
                    .replace(
                      "$searchGlobalBeforeManual",
                      String(this.preferences.enter.searchGlobalBeforeManual),
                    )
                    .replace("$model", String(this.preferences.enter.model))
                    .replace(
                      "$firstIntervalReview",
                      String(this.preferences.enter.firstIntervalReview),
                    ),
                },
              ),
          ];

          return {
            embeds,
            components,
            content: "",
          };
        } else if (this.platform === "telegram") {
          const replyMarkup = InlineKeyboard.keyboard([
            InlineKeyboard.textButton({
              text: text(
                "main_menu.settings.preferences.title",
                this.preferences.interfaceLanguage,
              ),
              payload: "main_menu.settings.preferences",
            }),
            InlineKeyboard.textButton({
              text: text(
                "main_menu.settings.preferences.langs_title",
                this.preferences.interfaceLanguage,
              ),
              payload: "main_menu.settings.preferences.langs_title",
            }),
            InlineKeyboard.textButton({
              text: text(
                "main_menu.settings.preferences.platform_and_account_title",
                this.preferences.interfaceLanguage,
              ),
              payload:
                "main_menu.settings.preferences.platform_and_account_title",
            }),
            InlineKeyboard.textButton({
              text: text(
                "main_menu.settings.preferences.enter_master_title",
                this.preferences.interfaceLanguage,
              ),
              payload: "main_menu.settings.preferences.enter_master_title",
            }),
            // home
            InlineKeyboard.textButton({
              text: text("main_menu.home", this.preferences.interfaceLanguage),
              payload: "main_menu.home",
            }),
          ]);

          return {
            content: "not implemented yet, waiting release in discord embeds.",
            replyMarkup,
            parse_mode: "HTML",
          };
        }
        break;

      case Location.Quotes:
      case Location.History:
      case Location.Feedback:
      case Location.SpawnFilterQualityASC:
      case Location.SpawnFilterStrengthASC:
      case Location.SpawnFilterNewestFirst:
      case Location.SpawnFilterOldestFirst:
      case Location.SpawnFilterReviewCount:
      case Location.SpawnFilterRandom: {
        if (this.preferences.review.filters.includes(this.current_location)) {
          this.preferences.review.filters =
            this.preferences.review.filters.filter(
              (f) => f !== this.current_location,
            );
        } else {
          this.preferences.review.filters.push(this.current_location);
        }

        if (
          this.preferences.review.filters.includes(
            Location.SpawnFilterNewestFirst,
          ) &&
          this.preferences.review.filters.includes(
            Location.SpawnFilterOldestFirst,
          )
        ) {
          const targetToRemove =
            this.current_location === Location.SpawnFilterNewestFirst
              ? Location.SpawnFilterOldestFirst
              : Location.SpawnFilterNewestFirst;

          this.preferences.review.filters =
            this.preferences.review.filters.filter((f) => f !== targetToRemove);
        }

        if (
          this.preferences.review.filters.includes(Location.SpawnFilterRandom)
        ) {
          this.preferences.review.filters = [Location.SpawnFilterRandom];
        }
      }
      case Location.Spawn: {
        console.log(this.platform)
        const getFilterStyle = (loc: Location) =>
          this.preferences.review.filters.includes(loc)
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary;

        if (this.platform === "discord") {
          const content = text(
            "main_menu.spawn.description",
            this.preferences.interfaceLanguage,
          );

          components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(Location.SpawnFilterQualityASC)
                .setLabel(
                  text(
                    Location.SpawnFilterQualityASC,
                    this.preferences.interfaceLanguage,
                  ),
                )
                .setStyle(getFilterStyle(Location.SpawnFilterQualityASC))
                .setDisabled(
                  this.preferences.review.filters.includes(
                    Location.SpawnFilterRandom,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId(Location.SpawnFilterStrengthASC)
                .setLabel(
                  text(
                    Location.SpawnFilterStrengthASC,
                    this.preferences.interfaceLanguage,
                  ),
                )
                .setStyle(getFilterStyle(Location.SpawnFilterStrengthASC))
                .setDisabled(
                  this.preferences.review.filters.includes(
                    Location.SpawnFilterRandom,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId(Location.SpawnFilterNewestFirst)
                .setLabel(
                  text(
                    Location.SpawnFilterNewestFirst,
                    this.preferences.interfaceLanguage,
                  ),
                )
                .setStyle(getFilterStyle(Location.SpawnFilterNewestFirst))
                .setDisabled(
                  this.preferences.review.filters.includes(
                    Location.SpawnFilterRandom,
                  ),
                ),
            ),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(Location.SpawnFilterOldestFirst)
                .setLabel(
                  text(
                    Location.SpawnFilterOldestFirst,
                    this.preferences.interfaceLanguage,
                  ),
                )
                .setStyle(getFilterStyle(Location.SpawnFilterOldestFirst))
                .setDisabled(
                  this.preferences.review.filters.includes(
                    Location.SpawnFilterRandom,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId(Location.SpawnFilterReviewCount)
                .setLabel(
                  text(
                    Location.SpawnFilterReviewCount,
                    this.preferences.interfaceLanguage,
                  ),
                )
                .setStyle(getFilterStyle(Location.SpawnFilterReviewCount))
                .setDisabled(
                  this.preferences.review.filters.includes(
                    Location.SpawnFilterRandom,
                  ),
                ),
              new ButtonBuilder()
                .setCustomId(Location.SpawnFilterRandom)
                .setLabel(
                  text(
                    Location.SpawnFilterRandom,
                    this.preferences.interfaceLanguage,
                  ),
                )
                .setStyle(getFilterStyle(Location.SpawnFilterRandom)),
              new ButtonBuilder()
                .setCustomId(
                  this.preferences.review.filters.includes(
                    Location.SpawnFilterReviewCount,
                  )
                    ? Location.SpawnFilterConfirmByEnteringCount
                    : Location.SpawnFilterConfirm,
                )
                .setLabel(
                  text(
                    this.preferences.review.filters.includes(
                      Location.SpawnFilterReviewCount,
                    )
                      ? Location.SpawnFilterConfirmByEnteringCount
                      : Location.SpawnFilterConfirm,
                    this.preferences.interfaceLanguage,
                  ),
                )
                .setStyle(ButtonStyle.Success),
            ),
          ];

          await this.preferences.save();

          return { embeds: [], components, content };
        } else if (this.platform === "telegram") {
          await this.preferences.save();
          return {
            content: text(
              "main_menu.spawn.description",
              this.preferences.interfaceLanguage,
            ),
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text:
                      (this.preferences.review.filters.includes(
                        Location.SpawnFilterQualityASC,
                      )
                        ? `🟢 `
                        : ``) +
                      text(
                        Location.SpawnFilterQualityASC,
                        this.preferences.interfaceLanguage,
                      ),
                    callback_data: Location.SpawnFilterQualityASC,
                  },
                  {
                    text:
                      (this.preferences.review.filters.includes(
                        Location.SpawnFilterStrengthASC,
                      )
                        ? `🟢 `
                        : ``) +
                      text(
                        Location.SpawnFilterStrengthASC,
                        this.preferences.interfaceLanguage,
                      ),
                    callback_data: Location.SpawnFilterStrengthASC,
                  },
                ],
                [
                  {
                    text:
                      (this.preferences.review.filters.includes(
                        Location.SpawnFilterNewestFirst,
                      )
                        ? `🟢 `
                        : ``) +
                      text(
                        Location.SpawnFilterNewestFirst,
                        this.preferences.interfaceLanguage,
                      ),
                    callback_data: Location.SpawnFilterNewestFirst,
                  },
                  {
                    text:
                      (this.preferences.review.filters.includes(
                        Location.SpawnFilterOldestFirst,
                      )
                        ? `🟢 `
                        : ``) +
                      text(
                        Location.SpawnFilterOldestFirst,
                        this.preferences.interfaceLanguage,
                      ),
                    callback_data: Location.SpawnFilterOldestFirst,
                  },
                ],
                [
                  {
                    text:
                      (this.preferences.review.filters.includes(
                        Location.SpawnFilterReviewCount,
                      )
                        ? `🟢 `
                        : ``) +
                      text(
                        Location.SpawnFilterReviewCount,
                        this.preferences.interfaceLanguage,
                      ),
                    callback_data: Location.SpawnFilterReviewCount,
                  },
                  {
                    text:
                      (this.preferences.review.filters.includes(
                        Location.SpawnFilterRandom,
                      )
                        ? `🟢 `
                        : ``) +
                      text(
                        Location.SpawnFilterRandom,
                        this.preferences.interfaceLanguage,
                      ),
                    callback_data: Location.SpawnFilterRandom,
                  },
                ],
                [
                  {
                    text: !this.preferences.review.filters.includes(
                      Location.SpawnFilterReviewCount,
                    )
                      ? text(
                          Location.SpawnFilterConfirm,
                          this.preferences.interfaceLanguage,
                        )
                      : text(
                          Location.SpawnFilterConfirmByEnteringCount,
                          this.preferences.interfaceLanguage,
                        ),
                    callback_data: !this.preferences.review.filters.includes(
                      Location.SpawnFilterReviewCount,
                    )
                      ? Location.SpawnFilterConfirm
                      : Location.SpawnFilterConfirmByEnteringCount,
                  },
                ],
              ],
            },
          };
        }
      }

      case Location.SpawnFilterConfirm:
        const spawn = new Spawn();
        spawn.userId = this.user.id;
        spawn.platform = this.platform;
        spawn.during = this.preferences.idleTimeout;
        spawn.flashcards = await this.user.getFlashcards({
          userId: this.user.id,
          sortBy: this.preferences.review.filters,
        });
        await spawn.initialize();

        const notification = new Notification();
        notification.type = NotificationType.SpawnViaMenu;
        notification.active = true;
        notification.expiryPolicy = ExpiryPolicy.Discard;
        notification.data = {
          userId: this.user.id,
          deleteAfter: this.preferences.idleTimeout,
          updatedNow: false,
          message: "Custom session.",
          alwaysUpdate: false,
          buttons: [
            {
              name: `Review ${process.env.version}`,
              id: `instant:spawn:${spawn.uuid}:go`,
            },
          ],
        };

        notification.uuid = spawn.uuid;
        await notification.save();
        //  await notification.send();

        await spawn.do(
          1,
          {
            platform: this.platform,
            userId:
              this.platform === "discord"
                ? this.user.discordIDS
                : this.user.telegramIDs[0],
          },
          this.preferences.review.side,
        );

        if (this.platform === "discord") {
          return {
            embeds: [],
            components: [],
            content: "Custom session was created successfully.",
          };
        } else if (this.platform === "telegram") {
          return {
            text: "Custom session was created successfully.",
          };
        }
        break;

      case Location.Registration:
      case Location.RegistrationPreferences:
      case Location.CreateFolder:
      case Location.CreateSet:
      case Location.CreateWord:
      case Location.ReviewWord:
      case Location.ChangingKnowingLanguages:
      case Location.AddingNewLanguage:
      case Location.ReadingAboutInteractionBot:
      case Location.Dictionary:
        const content = `[WARNING]: (9003]: you clicked the ${this.current_location} button, which is not implemented yet`;
        return { embeds: [], components: [], content };
      default:
        if (this.platform === "discord") {
          const content = `[WARNING]: (9001): you clicked the ${this.current_location} button, which is not implemented yet`;
          return { embeds: [], components: [], content };
        } else if (this.platform === "telegram") {
          const content = `[WARNING]: (9001]: you clicked the <u><b>${this.current_location}</b></u> button, which is not implemented yet`;
          return { replyMarkup: [], parseMode: "HTML", content };
        }
    }
  }
}
