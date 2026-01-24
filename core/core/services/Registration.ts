import { CEFR, Preferences } from "database";
import { DiscordClient } from "discord";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  DMChannel,
  EmbedBuilder,
  Message,
  User,
} from "discord.js";

export class Registration {
  /** Айди пользователя */
  id?: number;

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
  };

  /** Телеграм аккаунты пользователя */
  telegramAccounts?: number[];

  /** Дискорд аккаунты пользователя */
  discordAccounts?: string[];

  /** Дата начала регистрации */
  startAt: number;

  /** Тип настройки */
  settingPreferencesType?: "default" | "detailed" | "dialogue";

  /** Настройки предпочтений */
  preferences?: Preferences;

  async initialize(meta: {
    messageId?: string | number;
    channelId?: string | number;
    userId?: string | number;
    platform?: "discord" | "telegram";
  }) {
    this.meta = meta;
    await this.step(1);
  }

  async step(num: number) {
    if (this.meta.platform === "discord") {
      let user: User;
      let message: Message;
      let channel: DMChannel;

      if (this.meta.messageId) {
        user = await DiscordClient.users.fetch(this.meta.userId as string);
        message = await user.dmChannel.messages.fetch(
          this.meta.messageId as string,
        );
        channel = user.dmChannel;
      } else {
        user = await DiscordClient.users.fetch(this.meta.userId as string);
        message = await user.send("Инициализируем процесс регистрации...");
        channel = user.dmChannel;

        this.meta = {
          userId: user.id,
          messageId: message.id,
          channelId: channel.id,
          platform: "discord",
        };
      }

      switch (num) {
        case 1:
          await message.edit({
            content: `Выберите свой родной язык, который вы знаете хотя бы на уровне B2+`,
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("ukrainian")
                  .setLabel("Українська")
                  .setStyle(ButtonStyle.Success),
                // etc
              ),
            ],
          });
          await this.step(2);
          break;

        case 2:
      }
    } else if (this.meta.platform === "telegram") {
      //unreleased rn
    }
  }
}
