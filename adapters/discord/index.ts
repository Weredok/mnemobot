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

const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent", "DirectMessages"],
});

client.once("ready", async () => {
  
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
            .setStyle(ButtonStyle.Primary),
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
                      `**Фильтры настраиваиваются по нажатию на нужный вам параметр. \nЕсли кнопка с нужным параметром серая - значит, параметр никак не влияет на фильтр\nЕсли кнопка синяя - значит параметр считается от высшего его значения\nЕсли кнопка красная - хначит параметр считается от нижнего его значения**\nПример работы фильтра \`Частотность\` (сколько раз слово повторялось ранее)\n\n*1. Серая кнопка - \`частотность\` никак не влияет на фильтр в словаре\n2. Синяя кнопка - будут отображаться слова от высшей \`частотности\` до низшей\n3.  Красная кнопка - будут отображаться слова от низшей \`частотности\` до высшей*\n`,
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
                      "Выберите язык, с которым хотите работать сейчас",
                    ),
                  ];
                  let row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                      .setCustomId(`language:create:noneed`)
                      .setLabel("Создать")
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
  if (message.author.bot) return;
  if (!message.content) return;
  switch (message.content) {
    default:
      const user = await User.findOneBy({ discordIDS: message.author.id });
      if(user.reviewing) return ;
      const preferences = await Preferences.findOneBy({ id: user.id });

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
