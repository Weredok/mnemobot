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
  ActionRow,
  ActionRowBuilder,
  ActionRowComponent,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ComponentType,
  DMChannel,
  EmbedBuilder,
  MessageActionRowComponent,
  ModalBuilder,
  Partials,
  StringSelectMenuBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  TopLevelComponent,
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
import path from "path";
import { MenuHelper, StartMenu } from "commands";
import { platform } from "os";
import { Location } from "commands/classes/StartMenu.ts";
import { Debugger } from "commands/classes/debug/Debugger.ts";

const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent", "DirectMessages"],
  partials: [Partials.Channel, Partials.Message],
  presence: {
    activities: [
      {
        name: `v${process.env.version} | /start`,
        state: "discord",
        type: ActivityType.Competing,
      },
    ],
    status: "idle",
  },
});

client.on("interactionCreate", async (interaction) => {

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "start" &&
    interaction.user.id === "1276300934141579305"
  ) {
    await interaction.deferReply({ ephemeral: true });
    const user = await User.findOneBy({ discordIDS: interaction.user.id });
    const mh = new MenuHelper(
      user,
      {
        userId: user.id,
        discordUserId: interaction.user.id,
        telegramUserId: user.telegramIDs[0],
      },
      "discord",
    );
    const startmenu = new StartMenu(mh);

    await startmenu.initialize();
    const { embeds, components, content } = await startmenu.locate();
    await interaction.editReply({ embeds, components, content });
  } else if (
    interaction.isButton() &&
    interaction.customId.split(".").length > 1
  ) {
    interaction.customId.split(".")[
      interaction.customId.split(".").length - 1
    ] !== "modal"
      ? (await interaction.deferUpdate(),
        await interaction.editReply({
          components: interaction.message.components.length
            ? interaction.message.components.map((a) => {
                return new ActionRowBuilder<
                  ButtonBuilder | StringSelectMenuBuilder
                >().addComponents(
                  // @ts-ignore
                  a.components.map((b) => {
                    if (b.type === ComponentType.Button) {
                      return new ButtonBuilder(b.data)
                        .setDisabled(true)
                        .setStyle(ButtonStyle.Secondary);
                    } else if (b.type === ComponentType.StringSelect) {
                      return new StringSelectMenuBuilder(b.data).setDisabled(
                        true,
                      );
                    }
                  }),
                );
              })
            : [],
        }))
      : undefined;

    const user = await User.findOneBy({ discordIDS: interaction.user.id });
    const mh = new MenuHelper(
      user,
      {
        userId: user.id,
        discordUserId: interaction.user.id,
        telegramUserId: user.telegramIDs[0],
      },
      "discord",
    );

    const startmenu = new StartMenu(mh);
    await startmenu.initialize();
    const { embeds, components, content, modal } = await startmenu.locate(
      interaction.customId as Location,
    );

    console.log(interaction.customId, "trig");

    if ((embeds.length || components.length) && !modal) {
      await interaction.editReply({
        embeds: embeds ? embeds : [],
        components: components ? components : [],
        content: content ? content : "",
      });
    } else if (!embeds.length && !components.length && !content && !modal) {
      await interaction.editReply({
        content: `[WARNING]: (9002) **__${interaction.customId}__** not implemented yet :)`,
      });
    } else if (modal) {
      await interaction.showModal(modal);
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isModalSubmit()) {
    switch (interaction.customId) {
      case "main_menu.settings.change_user_info_modal":
        await interaction.deferUpdate();
        const user = await User.findOneBy({ discordIDS: interaction.user.id });
        const mh = new MenuHelper(
          user,
          {
            userId: user.id,
            discordUserId: interaction.user.id,
            telegramUserId: user.telegramIDs[0],
          },
          "discord",
        );

        user.name = interaction.fields
          .getTextInputValue("main_menu.settings.change_user_info_username")
          .slice(0, 24);
        user.password = interaction.fields
          .getTextInputValue("main_menu.settings.change_user_info_password")
          .slice(0, 24);

        await user.save();

        const startmenu = new StartMenu(mh);
        await startmenu.initialize();
        const { embeds, components, content, modal } = await startmenu.locate(
          Location.Settings,
        );
        await interaction.editReply({
          embeds: embeds ? embeds : [],
          components: components ? components : [],
          content:
            `${text("main_menu.settings.change_user_info.success", startmenu.preferences.interfaceLanguage)}` +
            content
              ? `\n\n${content}`
              : "",
        });

        break;
    }
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content) return;

  if(message.content === "debug"){
    const debugger_ = new Debugger((await User.findOneBy({ discordIDS: message.author.id })).id, "discord", message.id);
    await debugger_.attach()
    await debugger_.webhook();
    return;
  }

  switch (message.content) {
    default:
      const user = await User.findOneBy({ discordIDS: message.author.id });
      if (user.reviewing) return;
      const preferences = await Preferences.findOneBy({ id: user.id });

      if (user.lastAwaited + preferences.idleTimeout > Date.now()) return;

      const iWord = new WordInteraction(
        user,
        preferences.language,
        message.channel as DMChannel,
      );

      await iWord.enter(message.content);

      break;
  }
});

await client.login(process.env.discord_adapter_token);

export { client as DiscordClient };
