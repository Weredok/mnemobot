import { Flashcard, Preferences, Session, User } from "database";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ComponentType,
  DMChannel,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ILike } from "typeorm";
import { defer, Dictionary } from "core";
import { setupNewLanguage } from "./interactions/setupNewLanguage.ts";
import { DictionaryPortalAtDiscord } from "./portals/Dictionary.ts";
import { reviewWord } from "./interactions/reviewWord.ts";
import { WordInteraction } from "./interactions/WordInteraction.ts";

const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent", "DirectMessages"],
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === "start") {
      await interaction.deferReply();

      const components = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("settings")
            .setLabel("Настройки")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("dictionary")
            .setLabel("Словарь")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("create")
            .setLabel("Создать")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("interactive")
            .setLabel("Интерактив")
            .setStyle(ButtonStyle.Primary)
        ),
      ];

      const message = await interaction.followUp({
        content: "test",
        components: components,
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
              case "dictionary": {
                await defer(interaction);

                const dictionaryPortal = new DictionaryPortalAtDiscord(
                  dictionary,
                  interaction
                );
                await dictionaryPortal.initialize(
                  await User.findOneBy({
                    discordIDS: interaction.user.id,
                  }).then((user) => user.id)
                );

                break;
              }

              case "filter": {
                await interaction.editReply({
                  components: dictionary.buildButtonsUtil(),
                  embeds: [
                    embed.setDescription(
                      `**Фильтры настраиваиваются по нажатию на нужный вам параметр. \nЕсли кнопка с нужным параметром серая - значит, параметр никак не влияет на фильтр\nЕсли кнопка синяя - значит параметр считается от высшего его значения\nЕсли кнопка красная - хначит параметр считается от нижнего его значения**\nПример работы фильтра \`Частотность\` (сколько раз слово повторялось ранее)\n\n*1. Серая кнопка - \`частотность\` никак не влияет на фильтр в словаре\n2. Синяя кнопка - будут отображаться слова от высшей \`частотности\` до низшей\n3.  Красная кнопка - будут отображаться слова от низшей \`частотности\` до высшей*\n`
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

              case "sets":
                break;

              case "language": {
                if (!data) {
                  const components: ActionRowBuilder<ButtonBuilder>[] = [];
                  const embeds = [
                    new EmbedBuilder().setTitle(
                      "Выберите язык, с которым хотите работать сейчас"
                    ),
                  ];
                  let row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                      .setCustomId(`language:create:noneed`)
                      .setLabel("Создать")
                      .setStyle(ButtonStyle.Primary)
                  );

                  for (let i = 0; i < dictionary.user.languages.length; i++) {
                    row.addComponents(
                      new ButtonBuilder()
                        .setCustomId(
                          `dictionary:${dictionary.user.languages[i]}`
                        )
                        .setLabel(dictionary.user.languages[i])
                        .setStyle(ButtonStyle.Success)
                    );
                    embeds[0].addFields({
                      name: dictionary.user.languages[i],
                      value: `Словарь на n (в будущем доделаю) слов`,
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
                      .setTitle("Выбор нового языка для изучения")
                      .addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                          new TextInputBuilder()
                            .setCustomId("language")
                            .setLabel("Название языка")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMinLength(5)
                            .setMaxLength(25)
                        )
                      )
                  );

                  await interaction
                    .awaitModalSubmit({
                      time: dictionary.preferences.idleTimeout,
                    })
                    .then(async (int) => {
                      user.languages.push(
                        int.fields.getTextInputValue("language")
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
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content) return;
  switch (message.content) {
    default:
      const user = await User.findOneBy({ discordIDS: message.author.id });
      const preferences = await Preferences.findOneBy({ id: user.id });

      if (user.lastAwaited + preferences.idleTimeout > Date.now()) return;

      const iWord = new WordInteraction(user, message.channel as DMChannel);

      await iWord.enter(message.content);

      break;
  }
});

client.login(
  "MTMyNjMyOTA2OTQyMzI5NjU2Mw.Glyq5H.23wU9Cm3kV4i3OwAomEfHfesWiM0zUtcE_f1fA"
);

export { client as DiscordClient };
