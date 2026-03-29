import { randomUUID } from "crypto";
import { CEFR, Preferences, User as UserDatabase } from "database";
import { DiscordClient } from "discord";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Collection,
  ComponentType,
  DMChannel,
  EmbedBuilder,
  Interaction,
  InteractionType,
  Message,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from "discord.js";
import { renewal } from "../ai/Renewal.ts";
import { Log } from "database/models/Log.ts";
import { text } from "../../languages/index.ts";

export class Registration {
  /** Айди пользователя */
  id?: number;

  /** Имя пользователя */
  username: string;

  /** Пароль */
  password: string;

  /** Аноним */
  anonymous: boolean;

  /** Метаданные о сообщении, которое используется для регистрации */
  meta?: {
    messageId?: string | number;
    channelId?: string | number;
    userId?: string | number;
    platform?: "discord" | "telegram";
  };

  /** Язык интерфейса на платформе регистрации */
  interfaceLanguage?: string;

  /** Языки, которые пользователь знает или желает изучать */
  languages?: {
    name: string;
    knowing: CEFR;
  }[];

  /** Телеграм аккаунты пользователя */
  telegramAccounts?: number[];

  /** Дискорд аккаунты пользователя */
  discordAccounts?: string[];

  /** Дата начала регистрации */
  startAt: number;

  /** Тип настройки */
  settingPreferencesType?: "default" | "detailed" | "dialogue";

  /** Настройки предпочтений */
  preferences?: Partial<Preferences>;

  user?: Partial<User>;

  async initialize(meta: {
    messageId?: string | number;
    channelId?: string | number;
    userId?: string | number;
    platform?: "discord" | "telegram";
    interaction?: Interaction;
  }) {
    this.meta = meta;
    await this.step(1, undefined, meta.interaction);
  }

  async step(num: number, data?: string, interaction?: Interaction) {
    if (interaction?.type === InteractionType.ApplicationCommandAutocomplete)
      return;

    if (this.meta.platform === "discord") {
      const logger = new Log();

      logger.type = "info";
      logger.author = {
        id: 100000000000,
        username: interaction?.user.username,
        iconURL: interaction?.user.avatarURL(),
      };
      let user = await DiscordClient.users.fetch(this.meta.userId as string);

      switch (num) {
        case 1:
          logger.systemMessage = JSON.stringify(this, (key, value) => {
            if (typeof value === "bigint") {
              return value.toString();
            }
            return value;
          });
          await interaction.followUp(
            text("registration.initializing", this.interfaceLanguage),
          );
          console.log(this);
          const message_ = await interaction?.editReply({
            content: text(
              "registration.select_languages",
              this.interfaceLanguage,
            ),
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("regstatlang")
                  .setLabel(
                    text("registration.select_button", this.interfaceLanguage),
                  )
                  .setStyle(ButtonStyle.Success),
              ),
            ],
          });

          logger.message = `User ${interaction?.user.id} started registration`;
          await logger.send();

          await message_
            .awaitMessageComponent({
              componentType: ComponentType.Button,
              time: 300000,
            })
            .then(async (interaction) => {
              await interaction.showModal(
                new ModalBuilder()
                  .setCustomId("regstatlangm")
                  .setTitle(
                    text(
                      "registration.select_languages",
                      this.interfaceLanguage,
                    ),
                  )
                  .addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setCustomId("main")
                        .setLabel(
                          text(
                            "registration.main_language",
                            this.interfaceLanguage,
                          ),
                        )
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("English")
                        .setRequired(true)
                        .setMinLength(5)
                        .setMaxLength(20),
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setCustomId("languages")
                        .setLabel(
                          text(
                            "registration.target_languages",
                            this.interfaceLanguage,
                          ),
                        )
                        .setPlaceholder(
                          text(
                            "registration.target_languages_by_a_comma",
                            this.interfaceLanguage,
                          ),
                        )
                        .setStyle(TextInputStyle.Short)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(5)
                        .setMaxLength(100),
                    ),
                  ),
              );

              await interaction
                .awaitModalSubmit({ time: 300000 })
                .then(async (modalsubmit) => {
                  await logger.send();
                  // await interaction.deferReply({ ephemeral: true });
                  // const message =await interaction.followUp({
                  //   content: ":white_check_mark:",
                  // });

                  // await message.delete();

                  await modalsubmit.deferUpdate();

                  await this.step(
                    2,
                    modalsubmit.fields.getTextInputValue("main") +
                      " | " +
                      modalsubmit.fields.getTextInputValue("languages"),
                    modalsubmit,
                  );
                });
            });
          break;

        case 2:
          logger.systemMessage = data;
          logger.message = `User ${interaction?.user.id} at 2 step of registration`;
          await logger.send();
          console.log(data);
          this.interfaceLanguage = data.split(" | ")[0];
          this.languages = [{ name: this.interfaceLanguage, knowing: CEFR.C2 }];
          this.languages.push(
            ...data
              .split(" | ")[1]
              .trim()
              .split(",")
              .map((ln) => {
                return { name: ln, knowing: CEFR.A1 };
              }),
          );

          const message__ = await interaction.editReply({
            content: text(
              "registration.login_step_longread",
              this.interfaceLanguage,
            ),
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("signup")
                  .setLabel(text("registration.title", this.interfaceLanguage))
                  .setStyle(ButtonStyle.Primary),
              ),
            ],
          });

          message__
            .awaitMessageComponent({ time: 120 * 1000 })
            .then(async (collected) => {
              await collected.showModal(
                new ModalBuilder()
                  .setCustomId("reglog")
                  .setTitle(text("registration.title", this.interfaceLanguage))
                  .addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setCustomId("username")
                        .setLabel(
                          text("registration.username", this.interfaceLanguage),
                        )
                        .setValue(user?.username?.trim())
                        .setRequired(true)
                        .setMinLength(5)
                        .setMaxLength(20)
                        .setStyle(TextInputStyle.Short),
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setCustomId("password")
                        .setLabel(
                          text("registration.password", this.interfaceLanguage),
                        )
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(8)
                        .setMaxLength(30)
                        .setValue(
                          randomUUID()
                            .replaceAll("-", "")
                            .slice(0, 16)
                            .toUpperCase(),
                        ),
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setLabel(
                          text(
                            "registration.anonymous",
                            this.interfaceLanguage,
                          ),
                        )
                        .setCustomId("anonymous")
                        .setPlaceholder(
                          text(
                            "registration.anon_disclaimer",
                            this.interfaceLanguage,
                          ),
                        )
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short),
                    ),
                  ),
              );

              await collected
                .awaitModalSubmit({ time: 120000 })
                .then(async (intr) => {
                  await intr.deferUpdate();
                  await this.step(
                    3,
                    intr.fields.getTextInputValue("username") +
                      " ||| " +
                      intr.fields.getTextInputValue("password") +
                      " ||| " +
                      intr.fields.getTextInputValue("anonymous"),
                    intr,
                  );
                });
            });
          break;

        case 3:
          logger.systemMessage = data;
          logger.message = `User ${interaction?.user.id} at 3 step of registration`;
          await logger.send();
          this.username = data.split(" ||| ")[0];
          this.password = data.split(" ||| ")[1];
          this.anonymous = Boolean(data.split(" ||| "));

          const message___ = await interaction.editReply({
            content: text("registration.want_connect", this.interfaceLanguage),
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("connect_discord")
                  .setLabel(
                    text(
                      "registration.connect_discord",
                      this.interfaceLanguage,
                    ),
                  )
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId("connect_telegram")
                  .setLabel(
                    text(
                      "registration.connect_telegram",
                      this.interfaceLanguage,
                    ),
                  )
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId("regtg_no")
                  .setLabel(text("registration.later", this.interfaceLanguage))
                  .setStyle(ButtonStyle.Secondary),
              ),
            ],
          });

          message___
            .awaitMessageComponent({ time: 120000 })
            .then(async (interaction) => {
              await interaction.deferUpdate();
              if (interaction.customId === "regtg_yes") {
                // unreleased rn
              } else {
                this.step(4, "", interaction);
              }
            });
          break;

        case 4:
          this.preferences = new Preferences();
          await this.preferences.init();

          logger.systemMessage = JSON.stringify(this.preferences);
          logger.message = `User ${interaction?.user.id} at 4 step of registration`;
          await logger.send();
          const embeds = [
            new EmbedBuilder()
              .setColor("NotQuiteBlack")
              .setAuthor({
                iconURL: user.displayAvatarURL(),
                name: text(
                  "registration.pref_settings",
                  this.interfaceLanguage,
                ),
              })
              .addFields(
                {
                  name: text(
                    "registration.preferences.word_repetition",
                    this.interfaceLanguage,
                  ),
                  value: `**${text("registration.preferences.type_answer", this.interfaceLanguage)}:** ${this.preferences.review.answer.type}\n**${text("registration.preferences.auto_delete", this.interfaceLanguage)}:** ${this.preferences.review.answer.type}\n**__${text("registration.preferences.interval_rep", this.interfaceLanguage)}:__** ${this.preferences.review.sm2.mode}\n`,
                  inline: true,
                },
                {
                  name: text(
                    "registration.preferences.extend_dictionary",
                    this.interfaceLanguage,
                  ),
                  value: `**${text("registration.preferences.translation", this.interfaceLanguage)}:** ${this.preferences.enter.enterringTranslateType}\n**${text("registration.preferences.generate_examples", this.interfaceLanguage)}:** ${this.preferences.enter.generateExampleType}\n**${text("registration.preferences.global_search", this.interfaceLanguage)}:** ${this.preferences.enter.searchGlobalBeforeAI}`,
                  inline: true,
                },
                {
                  name: text(
                    "registration.preferences.general",
                    this.interfaceLanguage,
                  ),
                  value: `**${text("registration.preferences.prim_platform", this.interfaceLanguage)}:** ${this.preferences.platfrom} (${this.preferences.account})\n**${text("registration.preferences.notifications", this.interfaceLanguage)}:** ${this.preferences.notifications ? text("registration.preferences.enabled", this.interfaceLanguage) : text("registration.preferences.disabled", this.interfaceLanguage)}\n**${text("registration.preferences.recomendations", this.interfaceLanguage)}:** ${this.preferences.recomendations ? text("registration.preferences.enabled", this.interfaceLanguage) : text("registration.preferences.disabled", this.interfaceLanguage)}`,
                  inline: true,
                },
              )
              .setFooter({
                iconURL: interaction.client.user.displayAvatarURL(),
                text: text(
                  "registration.preferences.notice",
                  this.interfaceLanguage,
                ),
              }),
          ];

          const message____ = await interaction.editReply({
            content: "",
            embeds,
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("endreg")
                  .setLabel("Завершить регистрацию")
                  .setStyle(ButtonStyle.Success),
              ),
            ],
          });

          await message____
            .awaitMessageComponent({ time: 120000 })
            .then(async (interaction) => {
              await interaction.deferUpdate();

              let usr = new UserDatabase();
              usr.knowing = this.languages.reduce((acc, l) => {
                acc[l.name.toLowerCase().slice(0, 2)] = l.knowing;
                return acc;
              }, {});
              usr.languages = this.languages.map((l) =>
                l.name.toLowerCase().slice(0, 2),
              );
              usr.aiRestrictions = [];
              usr.aiUsing = [];
              usr.telegramIDs = [];
              usr.discordIDS = interaction.user.id;
              usr.wordsTotal = 0;
              usr.sets = [];
              usr.sessions = [];
              usr.name = this.username;
              usr.password = this.password;
              usr = await usr.save();

              const prefs = new Preferences();
              await prefs.init(usr);
              await prefs.save();

              await renewal(usr.id, {
                notice: "dev tests",
                timestamp: Date.now(),
                time: 9e90,
                renewal: 9e90,
                model: "gpt-4o-mini",
                output: 9e90,
                input: 9e90,
              });

              await interaction.editReply({
                content: "100 ok",
                components: [],
                embeds: [],
              });

              logger.systemMessage = JSON.stringify(usr);
              logger.message = `User ${interaction?.user.id} at 4 step of registration and finished it\n\n`;
              await logger.send();
            });
          break;
      }
    } else if (this.meta.platform === "telegram") {
      //unreleased rn
    }
  }
}
