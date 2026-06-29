import { datasource, Flashcard, Preferences, User } from "database";
import { BaseInteraction } from "./BaseInteraction.ts";
import { detectLanguages, Dictionary, OpenAIClient } from "core";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  DMChannel,
  EmbedBuilder,
  Message,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import fs from "node:fs";
import { ILike } from "typeorm";
import OpenAI from "openai";
import { DeveloperSelectedAiTargets } from "core/ai/Readme.ts";
import { getCurrentQuota } from "core/ai/Renewal.ts";
import { TelegramClient } from "telegram";
import { createHash } from "node:crypto";
import { text } from "../../../core/languages/index.ts";
import { EnterManageOptions } from "database/models/Preferences.ts";

export class WordInteraction extends BaseInteraction {
  word: Flashcard;

  constructor(
    user: User,
    languageCode: string,
    channel: DMChannel,
    word?: Flashcard,
    dictionary?: Dictionary,
  ) {
    super(user, languageCode, channel, dictionary);
    this.word = word;
  }

  async findDictionary(term: string, source?: string, target?: string) {
    /**
     * Фильтр, который откидывает потенциально похожие языки с функционала бота
     * Если пользователь пользуется русским или изучает его, то ему не будет предлагаться украинский или белорусский языки (но системно поддерживаются)
     */
    const filteredDetector = detectLanguages(term).filter((lang) => {
      return this.user.languages.includes(lang);
    });

    const dictionary = new Dictionary({
      userId: this.user.id,
      flashcardIds: [],
      folderIds: [],
      setIds: [],
      sets: [],
      folders: [],
      flashcards: [],
      user: this.user,
      preferences: await Preferences.findOneBy({ id: this.user.id }),
      language: {
        source:
          source ||
          (this.user.languages[0] === filteredDetector[0]
            ? this.user.languages[0]
            : filteredDetector[0]),
        target:
          target ||
          (filteredDetector[0] ===
          (this.user.languages[0] === filteredDetector[0]
            ? this.user.languages[0]
            : filteredDetector[0])
            ? this.user.languages[1] === filteredDetector[0]
              ? this.user.languages[0]
              : this.user.languages[1]
            : filteredDetector[0]),
      },
    });

    if (dictionary) {
      await dictionary.syncronize();
      this.dictionary = dictionary;
      return dictionary;
    } else {
      await this.syncronize();
      return false;
    }
  }

  async enterGeneratorUtil(
    flashcard: Flashcard | Flashcard[],
    message: Message,
    action: "create" | "read" | "update" | "delete",
    isAI: boolean = false,
  ) {
    const isArray = Array.isArray(flashcard);
    const flValues = {
      front: isArray
        ? flashcard.map((flashcard) => flashcard.front[0])
        : flashcard.front,
      back: isArray
        ? flashcard.map((flashcard) => flashcard.back[0])
        : flashcard.back,
    };

    return [
      new EmbedBuilder()
        .setColor("Blurple")
        .setAuthor({
          name: message.author.username,
          iconURL: message.author.displayAvatarURL(),
        })
        .setURL("https://discord.com")
        .setTitle(
          `(${flValues.front}) ${flValues.back} (${this.dictionary.language.target})`,
        )
        .setDescription(
          `${isAI ? text("word_interaction.ai_entered", this.languageCode) : text("word_interaction.you_entered", this.languageCode)} ${text("word_interaction.an_word", this.languageCode)} *${flValues.front}* \`${this.dictionary.language.source} -> ${this.dictionary.language.target}\``,
        )
        .setFooter({
          text: "Powered by nxdreaming with ❤️",
          iconURL: await message.client.users
            .fetch("1276300934141579305")
            .then((user) => user.displayAvatarURL()),
        })
        .setTimestamp(
          Math.round(isArray ? flashcard[0].createdAt : flashcard.createdAt),
        )
        .addFields(
          flashcard instanceof Array
            ? []
            : flashcard?.examples
              ? flashcard.examples.map((example) => ({
                  name: example.split("/")[0],
                  value: example.split("/")[1],
                }))
              : [],
        ),
    ];
  }

  async enter(data: string, source?: string, target?: string, auto?: boolean) {
    let embeds: EmbedBuilder[] = [];
    let components: ActionRowBuilder<ButtonBuilder>[] = [];

    if (data.split(", ").length > 1) {
    //  await data.split(", ").map(async (data) => {
    //     await this.enter(data, source, target, true);
    //   });

    for(const data_ of data.split(", ")) {
      await this.enter(data_, source, target, true);
    };
      return;
    } else {
      this.word = new Flashcard();
      this.word.front = [data];
      this.word.user = this.user.id;
    }

    const isWord = data.split(" ").length === 1;
    const dictionary = await this.findDictionary(data, source, target);

    // // won`t work temporairly
    // const isAlreadyInitialized =
    //   (await Flashcard.findOneBy({ front: data, user: this.user.id })) ||
    //   (await Flashcard.findOneBy({ back: data, user: this.user.id }));

    // if (isAlreadyInitialized) {
    //   const message = await this.channel.send(
    //     text("word_interaction.loading_placeholder", this.languageCode),
    //   );
    //   const embeds = await this.enterGeneratorUtil(
    //     isAlreadyInitialized,
    //     message,
    //     "read",
    //   );
    //   await message.edit({ embeds });
    //   return;
    // }

    if (!dictionary) {
      await this.syncronize(this.enter, data);
      return;
    }
    if (
      !this.dictionary.preferences.enter.selectSourceLanguageType &&
      !source
    ) {
      const selectingLanguageMessage = await this.channel.send({
        content: text("word_interaction.select_by_unidf", this.languageCode),
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("selectlng_entertype")
              .setPlaceholder(
                text(
                  "word_interaction.placeholder_language",
                  this.languageCode,
                ),
              )
              .addOptions(
                this.user.languages.map((lang) => {
                  return {
                    label: lang,
                    value: lang,
                    default: lang === this.dictionary.language.source,
                  };
                }),
              ),
          ),
        ],
      });

      selectingLanguageMessage
        .createMessageComponentCollector({
          max: 1,
          time: this.dictionary.preferences.idleTimeout,
        })
        .once("collect", async (interaction: StringSelectMenuInteraction) => {
          await interaction.message.delete();
          await this.enter(data, interaction.values[0], target);
        });
    }

    if (
      !this.dictionary.preferences.enter.selectTargetLanguageType &&
      !target
    ) {
      const selectingLanguageMessage = await this.channel.send({
        content: text(
          "word_interaction.select_target_language",
          this.languageCode,
        ),
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("selectlng_entertype")
              .setPlaceholder(
                text(
                  "word_interaction.placeholder_language",
                  this.languageCode,
                ),
              )
              .addOptions(
                this.user.languages.map((lang) => {
                  return {
                    label: lang,
                    value: lang,
                    default: lang === this.dictionary.language.target,
                  };
                }),
              ),
          ),
        ],
      });

      selectingLanguageMessage
        .createMessageComponentCollector({
          max: 1,
          time: this.dictionary.preferences.idleTimeout,
        })
        .once("collect", async (interaction: StringSelectMenuInteraction) => {
          await interaction.message.delete();
          await this.enter(data, source, interaction.values[0]);
        });
    }

    let time = this.dictionary.preferences.idleTimeout / 1000;
    let messageFill = () => {
      const key = isWord
        ? "word_interaction.waiting_translation_word"
        : "word_interaction.waiting_translation_phrase";
      return text(key, this.languageCode)
        .replace("$data", data)
        .replace("$source", dictionary.language.source)
        .replace("$target", this.dictionary.language.target)
        .replace("$time", time.toString());
    };

    components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ai:translate")
          .setLabel(
            text("word_interaction.button_ai_translate", this.languageCode),
          )
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("searchglobal")
          .setLabel(
            text("word_interaction.button_global_search", this.languageCode),
          )
          .setDisabled(true)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("cancel_ew")
          .setStyle(ButtonStyle.Danger)
          .setLabel(text("word_interaction.button_cancel", this.languageCode)),
      ),
    ];

    const message = await this.channel.send({
      content: !auto ? messageFill() : `Loading ${this.word.front.toString()}...`,
      components: !auto ? components : [],
    });

    const collector = message.createMessageComponentCollector({
      time: this.dictionary.preferences.idleTimeout,
    });
    this.user.lastAwaited = Date.now();
    await this.user.save();

    // Обновление сообщения ежесекундно на случай, если пользователь ждёт ии-перевода по таймеру
    let ai = true;
    const intervalOfEditingMessage = setInterval(async () => {
      if (!ai) return;
      time -= 1;

      if (time > 0) {
        // ping 
        await message.edit({ content: !auto ? messageFill() : `Loading ${this.word.front.toString()}...` });
      } else if (!time) {
        // ai core request function (future)
        await message.edit(
          text("word_interaction.time_is_up", this.languageCode),
        );
      } else if (time < 0) {
        clearInterval(intervalOfEditingMessage);
      }
    }, 999);

    if (auto) {
      ai = false;
      this.word = (await this.enterRequest(data, true, this.word)) as Flashcard;
      if (!this.word) {
        await message.edit(
          text("word_interaction.no_ai_quota", this.languageCode),
        );
      }
    }

    if (this.word?.front?.length && this.word?.back?.length)
      switch (this.dictionary.preferences.enter.generateExampleType) {
        case EnterManageOptions.AlwaysAi: {
          console.log("generating examples via auto")
          await this.generateExamples();
          return;
        }
      }

    await message.edit({
      content: "",
      embeds: await this.enterGeneratorUtil(this.word, message, "create"),
      components: !auto ? [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("generateexamples")
            .setLabel(
              text("word_interaction.button_examples", this.languageCode),
            )
            .setDisabled(this.word?.examples?.length > 0)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("cancel_ew")
            .setStyle(ButtonStyle.Secondary)
            .setLabel(
              text("word_interaction.button_cancel", this.languageCode),
            ),
        ),
      ] : [],
    });

    collector.on("collect", async (interaction) => {
      ai = false;
      if (interaction.customId === "ai:translate") {
        ai = false;
        await interaction.deferUpdate();
        this.word = (await this.enterRequest(
          data,
          true,
          this.word,
        )) as Flashcard;
        if (this.word) {
          const embeds = await this.enterGeneratorUtil(
            this.word,
            message,
            "create",
          );

          const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("generateexamples")
                .setLabel(
                  text("word_interaction.button_examples", this.languageCode),
                )
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId("cancel_ew")
                .setStyle(ButtonStyle.Secondary)
                .setLabel(
                  text("word_interaction.button_cancel", this.languageCode),
                ),
            ),
          ];

          await interaction.editReply({ content: "", embeds, components: !auto ? components : [] });
        } else {
          await interaction.editReply(
            text("word_interaction.no_ai_quota", this.languageCode),
          );
        }
      } else if (interaction.customId === "cancel_ew") {
        this.user.lastAwaited = 0;
        await this.user.save();
        await interaction.message.delete();
        return;
      } else if (interaction.customId === "searchglobal") {
        await interaction.deferReply();
        const flashcards = (await Flashcard.find()).filter((flashcard) => {
          return (
            flashcard.front
              .join(", ")
              .toLowerCase()
              .includes(data.toLowerCase()) ||
            flashcard.back.join(", ").toLowerCase().includes(data.toLowerCase())
          );
        });

        const embeds = [];
        const components: ActionRowBuilder<ButtonBuilder>[] = [];

        let i = 1;
        for (const flashcard of flashcards) {
          const user = await User.findOneBy({ id: flashcard.user });
          const discord = await this.channel.client.users.fetch(
            user.discordIDS,
          );
          const telegram = await TelegramClient.api.getChatMember({
            chat_id: this.dictionary.preferences.account,
            user_id: Number(this.dictionary.preferences.account),
          });
          const anonymous = (await Preferences.findOneBy({ id: user.id }))
            .anonymous;

          const embed = new EmbedBuilder()
            .setAuthor({
              name: anonymous
                ? `Anonymous ${createHash("sha256").update(`${Date.now()}`).digest("hex").slice(0, 4)}\*`
                : this.user.discordIDS
                  ? `${discord.username}`
                  : `${telegram.user.username}`,
              iconURL: anonymous
                ? null
                : this.user.discordIDS
                  ? discord.displayAvatarURL()
                  : TelegramClient.getFileURL(
                      await TelegramClient.api
                        .getUserProfilePhotos({
                          user_id: user.telegramIDs[0],
                          limit: 1,
                        })
                        .then((photos) => photos.photos[0][0].file_id),
                    ),
              url: interaction.message.url,
            })
            .setTitle(
              text("word_interaction.found_similar_title", this.languageCode)
                .replace("$i", i.toString())
                .replace(
                  "$source",
                  detectLanguages(flashcard.front.join(", ")).toString(),
                )
                .replace(
                  "$target",
                  detectLanguages(flashcard.back.join(", ")).toString(),
                ),
            )
            .setDescription(
              `\`${detectLanguages(flashcard.front.join(", "))}\`: *${flashcard.front.join(", ")}*\n\`${detectLanguages(flashcard.back.join(", "))}\`: *${flashcard.back.join(", ")}*`,
            )
            .setColor("#ffffff07");
          embeds.push(embed);

          if (
            components[components.length - 1].components.length === 5 ||
            i === flashcards.length
          ) {
            components.push(new ActionRowBuilder<ButtonBuilder>());
          }

          components[components.length - 1].addComponents(
            new ButtonBuilder()
              .setCustomId(`copy:${flashcard.id}`)
              .setLabel(
                text("word_interaction.button_copy", this.languageCode).replace(
                  "$i",
                  i.toString(),
                ),
              )
              .setStyle(ButtonStyle.Primary),
          );

          i++;
        }

        const intmessage = await interaction.followUp({
          embeds: embeds.splice(0, 25),
        });

        setInterval(async () => {
          await intmessage.delete();
          await interaction.editReply({ components: [] });
        }, this.dictionary.preferences.idleTimeout);

        await interaction.editReply({
          components: components.splice(0, 5),
        });
      }

      // Кнопки из сообщения с уже созданной и заполненной карточкой
      if (interaction.customId === "selectset") {
        // em ya hz
      } else if (interaction.customId === "generateexamples") {
        await interaction.deferUpdate();
        await this.generateExamples();

        await interaction.editReply({
          embeds: await this.enterGeneratorUtil(
            this.word,
            message,
            "read",
            true,
          ),
          components: [],
        });
      }
    });

    !auto ? await this.channel
      .awaitMessages({
        time: this.dictionary.preferences.idleTimeout,
        filter: (message) => message.author.id === this.user.discordIDS,
        max: 1,
      })
      .then(async (messages) => {
        const msg = messages.first();
        const data_ = msg?.content;
        const flashcard = await this.enterRequest([
          ...(data.includes(", ") ? data.split(", ") : data),
          ...data_.split(", "),
        ]) 

        // Save/cancel
        this.user.lastAwaited = 0;
        await this.user.save();

        if (typeof flashcard === "string") return;
        const isArray = Array.isArray(flashcard);
        const embeds = await this.enterGeneratorUtil(
          flashcard,
          message,
          "create",
        );
        const components = [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("generateexamples")
              .setLabel(
                text("word_interaction.button_examples", this.languageCode),
              )
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("cancel_ew")
              .setStyle(ButtonStyle.Secondary)
              .setLabel(
                text("word_interaction.button_cancel", this.languageCode),
              ),
          ),
        ];

        await message.edit({ embeds, components: !auto ? components : [] });
      }) : null;
  }

  async generateExamples() {
    const quota = await getCurrentQuota(
      this.user.id,
      DeveloperSelectedAiTargets[1],
    );
    const isSourceLanguage = detectLanguages(this.word.front[0]).includes(
      this.dictionary.language.source.slice(0, 2).toLowerCase(),
    );

    if (quota) {
      const rq = `From ${isSourceLanguage ? this.dictionary.language.source : this.dictionary.language.target} (${this.user.knowing[isSourceLanguage ? this.dictionary.language.source : this.dictionary.language.target] || "B1"}) to ${isSourceLanguage ? this.dictionary.language.target : this.dictionary.language.source} (${this.user.knowing[isSourceLanguage ? this.dictionary.language.target : this.dictionary.language.source] || "B1"}). Word: ${this.word.front[0]}.`;
      let datestamp = Date.now();
      const response = await OpenAIClient.responses.create({
        model: "gpt-4o-mini-2024-07-18",
        instructions: fs.readFileSync("instructions/examples.txt", "utf-8"),
        input: rq,
        temperature: 0.2,
        max_output_tokens: 200,
      });

      this.user.aiUsing.push({
        timestamp: Date.now(),
        usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
        model: response.model,
        output_text: response.output_text,
        input_text: rq,
        ping: Date.now() - datestamp,
      });

      await this.user.save();

      const {
        examples_source,
        examples_target,
      }: { examples_source: string[]; examples_target: string[] } = JSON.parse(
        response.output_text,
      );

      this.word.examples = [
        ...examples_target.map(
          (example, i) => `${examples_target[i]}/${examples_source[i]}`,
        ),
      ];
      await this.word.save();
      return { examples_source, examples_target };
    } else {
      return { examples_source: [], examples_target: [] };
    }
  }
}
