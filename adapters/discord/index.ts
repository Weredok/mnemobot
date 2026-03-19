import {
  CEFR,
  Flashcard,
  Notification,
  Preferences,
  Session,
  Spawn,
  User,
} from "database";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ComponentType,
  DMChannel,
  EmbedBuilder,
  ModalBuilder,
  Partials,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ILike } from "typeorm";
import { defer, Dictionary } from "core";
import { setupNewLanguage } from "./interactions/setupNewLanguage.ts";
import { DictionaryPortalAtDiscord } from "./portals/Dictionary.ts";
import { reviewWord } from "./interactions/reviewWord.ts";
import { WordInteraction } from "./interactions/WordInteraction.ts";
import { NotificationType } from "database/models/Notification.ts";
import { renewal } from "core/ai/Renewal.ts";
import { Registration } from "core/services/Registration.ts";
import { text } from "../../core/languages/index.ts";

const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent", "DirectMessages"],
  partials: [
        Partials.Channel, 
        Partials.Message 
    ]
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === "start") {
      await interaction.deferReply({ ephemeral: true });
      const user = await User.findOneBy({ discordIDS: interaction.user.id });

      if (!user) {
        const service = new Registration();
        await service.initialize({
          platform: "discord",
          userId: interaction.user.id,
          interaction,
        });
      } else {
        /**
         * Настройки
         * - Предпочтения
         * - Уведомления
         * - О боте
         * - СМ-2 значения
         * - Мультиплатформенность
         *
         * Словарь
         * - Сэты
         * - Фильтр (папки/сэты/карточки)
         * - Языки
         * - Интерактив
         *
         * История
         * - Фильтр истории
         *
         * Обратная связь
         * - Предложения
         * - Баг-репорт
         * - Вопрос по функционалу
         * - Документация
         *
         * Спавн
         * - Повтор слов
         * - Статистика за промежуток времени
         * - Последний чейнджлог
         * - Мотивационная статистика
         */

        const components = [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("settings")
              .setLabel(text("buttons_reference.settings", "en"))
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("dictionary")
              .setLabel(text("buttons_reference.dictionary", "en"))
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("history")
              .setLabel(text("buttons_reference.history", "en"))
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("feedback")
              .setLabel(text("buttons_reference.feedback", "en"))
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("spawn")
              .setLabel(text("buttons_reference.spawn", "en"))
              .setStyle(ButtonStyle.Secondary),
          ),
        ];

        const embeds = [
          new EmbedBuilder()
            .setColor("DarkButNotBlack")
            .setAuthor({
              name: interaction.user.username,
              iconURL: interaction.user.avatarURL() || "",
            })
            .setTitle(`${text("main_menu.welcome", "en")} ${user.name}`)
            .setDescription("descr not tested")
            .setFooter({
              text: `${text("main_menu.bot_version", "en")} ${process.env.version} | ${text("alpha_test.thanks", "en")}`,
              iconURL:
                "https://avatars.githubusercontent.com/u/230691002?u=34515c5df7da83f2bc3c87b87a81a9880b677945&v=4&size=80",
            })
            .setTimestamp(),
        ];

        const message = await interaction.followUp({
          embeds,
          components,
        });

        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60 * 1000,
        });

        collector.on("collect", async (interaction) => {
          const int = {
            type: interaction.component.type,
            customId: interaction.customId,
          };

          let embed: EmbedBuilder = new EmbedBuilder();
          let components: ActionRowBuilder<ButtonBuilder>[] = [];
          switch (int.type) {
            case ComponentType.Button: {
              const [name, data] = int.customId.split(":");
              const user = await User.findOneBy({
                discordIDS: interaction.user.id,
              });
              const preferences = await Preferences.findOneBy({ id: user.id });

              const dictionary = new Dictionary({
                userId: user.id,
                folderIds: [],
                setIds: [],
                flashcardIds: [],
                language: { source: "en", target: "ru" },
                folders: [],
                sets: [],
                flashcards: [],
                user,
                preferences,
              });
              await dictionary.syncronize();

              switch (
                name as
                  | "settings"
                  | "spawn"
                  | "history"
                  | "feedback"
                  | "dictionary"
                  | "create"
                  | "interactive"
                  | "sets"
                  | "language"
                  | "filter"
                  | "interactive"
                  | "frequency"
                  | "dateOfCreation"
                  | "length"
                  | "forgotten"
                  | "polysemitic"
                  | "page"
                  | "previous"
                  | "next"
              ) {
                case "spawn": {
                  const notification = new Notification();
                    notification.type = NotificationType.ReviewTime;
                    notification.data = {
                      userId: user.id,
                      message: "Testify notification",
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
                    spawn.userId = user.id;
                    await spawn.initialize()
                    await spawn.save();
                    await spawn.ask();
                  break
                };
                case "dictionary": {
                  await defer(interaction);

                  const dictionaryPortal = new DictionaryPortalAtDiscord(
                    dictionary,
                    interaction,
                  );
                  await dictionaryPortal.initialize(
                    await User.findOneBy({
                      discordIDS: interaction.user.id,
                    }).then((user) => user.id),
                  );

                  break;
                }

                case "filter": {
                  await interaction.editReply({
                    components: dictionary.buildButtonsUtil(),
                    embeds: [
                      embed.setDescription(
                        text("main_menu.filter.doc",preferences.interfaceLanguage)
                      ),
                    ],
                  });
                  break;
                }

                case "frequency":
                case "dateOfCreation":
                case "length":
                case "forgotten":
                case "polysemitic": {
                  let value: undefined | boolean =
                    dictionary.preferences.dictionaryFilters[
                      int.customId.split(":")[0]
                    ];
                  switch (value) {
                    case true:
                      value = false;
                      break;
                    case false:
                      value = undefined;
                      break;
                    case undefined:
                      value = true;
                      break;
                  }
                  dictionary.preferences.dictionaryFilters = {
                    ...dictionary.preferences.dictionaryFilters,
                    [int.customId.split(":")[0]]: value,
                  };
                  await dictionary.syncronize(true);
                  await interaction.editReply({
                    content: "",
                    components: dictionary.buildButtonsUtil(),
                  });
                  break;
                }
                case "language": {
                  if (!data) {
                    const components: ActionRowBuilder<ButtonBuilder>[] = [];
                    const embeds = [
                      new EmbedBuilder().setTitle(
                        text("language_switch.title", preferences.interfaceLanguage)
                      ),
                    ];
                    let row =
                      new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                          .setCustomId(`language:create:noneed`)
                          .setLabel(text("main_menu.language_switch.button_create", preferences.interfaceLanguage))
                          .setStyle(ButtonStyle.Primary),
                      );

                    for (let i = 0; i < dictionary.user.languages.length; i++) {
                      row.addComponents(
                        new ButtonBuilder()
                          .setCustomId(
                            `dictionary:${dictionary.user.languages[i]}`,
                          )
                          .setLabel(dictionary.user.languages[i])
                          .setStyle(ButtonStyle.Success),
                      );
                      embeds[0].addFields({
                        name: dictionary.user.languages[i],
                        value: text("main_menu.language_switch.dictionary_description", preferences.interfaceLanguage),
                      });
                      if (
                        row.components.length === 5 ||
                        i === dictionary.user.languages.length - 1
                      ) {
                        components.push(row);
                        row = new ActionRowBuilder<ButtonBuilder>();
                      }
                    }

                    await interaction.editReply({
                      embeds: embeds,
                      components: components,
                    });
                  } else {
                    await interaction.showModal(
                      new ModalBuilder()
                        .setCustomId(`dictionary:newlanguage`)
                        .setTitle(text("main_menu.language_switch.create_new_language", preferences.interfaceLanguage))
                        .addComponents(
                          new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                              .setCustomId("language")
                              .setLabel(text("main_menu.language_switch.name_language", preferences.interfaceLanguage))
                              .setStyle(TextInputStyle.Short)
                              .setRequired(true)
                              .setMinLength(5)
                              .setMaxLength(25),
                          ),
                        ),
                    );

                    await interaction
                      .awaitModalSubmit({
                        time: dictionary.preferences.idleTimeout,
                      })
                      .then(async (int) => {
                        user.languages.push(
                          int.fields.getTextInputValue("language"),
                        );
                        await user.save();
                      });
                  }
                  break;
                }
              }
            }
          }
        });
      }
    }
  }

  if (
    interaction.isButton() &&
    interaction.customId.split(":")[0] === "instant"
  ) {
    if (interaction.customId.split(":")[1] === "spawn") {
      const spawn = await Spawn.findOneBy({
        uuid: interaction.customId.split(":")[2],
      });

      await spawn.do(
        1,
        { platform: "discord", userId: interaction.user.id },
        "front",
      );
    }
  }
});

client.on("messageCreate", async (message) => {
  console.log(message.content)
  if (message.author.bot) return;
  if (!message.content) return;
  switch (message.content) {
    default:
      const user = await User.findOneBy({ discordIDS: message.author.id });
      console.log(user.reviewing)
      if (user.reviewing) return;
      const preferences = await Preferences.findOneBy({ id: user.id });

      console.log(user.lastAwaited + preferences.idleTimeout > Date.now())
      if (user.lastAwaited + preferences.idleTimeout > Date.now()) return;

      const iWord = new WordInteraction(user, message.channel as DMChannel);

      await iWord.enter(message.content);

      break;
  }
});

client.login(
  "MTMyNjMyOTA2OTQyMzI5NjU2Mw.Glyq5H.23wU9Cm3kV4i3OwAomEfHfesWiM0zUtcE_f1fA",
);

export { client as DiscordClient };
