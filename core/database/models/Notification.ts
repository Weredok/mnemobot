import {
  BaseEntity,
  Column,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User.ts";
import { TelegramClient } from "telegram";
import { InlineKeyboardBuilder } from "puregram";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  DMChannel,
} from "discord.js";
import { DiscordClient } from "discord";

export enum NotificationType {
  DevelopmentLog,
  ReviewTime,
  AFKStatus,
  Record,
  RateLimit,
  News,
  Error,
  Payment,
}

interface Button {
  name: string;
  id: string;
}

@Entity()
export class Notification extends BaseEntity {
  /** Уникальный айди уведомления */
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  /** Тип уведомления, от которого зависит поведение функций уведомления */
  @Column("simple-enum", { enum: NotificationType })
  type: NotificationType;

  /** Если уведомление активно, то с ним будут взаимодействия типо редактирования или удаления */
  @Column("boolean", { default: true })
  active: boolean;

  /** Данные уведомления */
  @Column("simple-json")
  data: {
    /** Айди пользователя */
    userId: number;
    /** Текстовое сообщение */
    message?: string;
    /**
     * Кнопки, которые нужно добавлять к сообщению.
     *
     * Формат:
     * [
     *   { name: string; id: string }
     * ]
     *
     * @example
     * const buttons: Array<
     *   { name: string, id: string }
     * ]> = [
     *   { name: "placeholder", id: "custom_id" },]
     */
    buttons?: Array<Button>;
    /** Время, когда нужно отправить */
    datestamp?: number;

    /** Массив с айди телеграм сообщений с уведомлением, отправленное пользователю */
    telegramMessageIDs?: Array<{ userID: number; messageID: number }>;
    /** Массив с айди дискорд сообщений с уведомлением, отправленное пользователю */
    discordMessageIDs?: Array<{
      userID?: string;
      messageID?: string;
      channel_id?: string;
    }>;

    /** Спустя сколько времени нужно удалить сообщения с уведомлениями */
    deleteAfter?: number;
    /** Спустя сколько времени нужно удалить кнопки с сообщения */
    deleteButtonsAfter?: number;

    /** Спустя сколько времени нужно редактировать сообщения с уведомлениями */
    editAfter?: number;
    /** Спустя сколько времени нужно редактировать кнопки с сообщения */
    editButtonsAfter?: number;
    /** Текстовое сообщение, для редактирования */
    editedMessage?: string;
    /** Кнопки, которые нужно добавлять к сообщению, для редактирования
     *  @example
     * const buttons: Array<
     *   { name: string, id: string }
     * ]> = [
     *   { name: "placeholder", id: "custom_id" },]
     */
    editedButtons?: Array<Button>;

    /**
     * Определяет, нужно ли выполнять отложенные действия (edit/delete)
     * повторно, если уведомление уже обновлялось ранее.
     *
     * true  — таймеры редактирования и удаления будут запускаться
     *         каждый раз при вызове send(), независимо от updatedNow.
     *
     * false — таймеры будут выполнены только один раз;
     *         если updatedNow === true, повторный запуск будет заблокирован.
     *
     * Используется для защиты от повторных edit/delete при повторной отправке уведомления.
     */
    alwaysUpdate: boolean;
    updatedNow: boolean;

    function?: (user: User) => Promise<void>;
  };

  async send() {
    this.active = true;
    await this.save();

    const user = await User.findOneBy({ id: this.data.userId });
    const rows = this.buildButtonsArray();

    if (user.telegramIDs.length > 0) {
      this.data.telegramMessageIDs = [];
      for (const id of user.telegramIDs) {
        setTimeout(
          async () => {
            try {
              const message = await TelegramClient.api.sendMessage({
                text: this.data.message,
                chat_id: id,
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true,
                reply_markup: rows.telegramKeyboard,
              });

              this.data.telegramMessageIDs?.push({
                userID: id,
                messageID: message.message_id,
              });

              await this.save();
            } catch {}
          },
          this.data.datestamp - Date.now() || 1000,
        );
      }
    }

    if (user.discordIDS.length > 0) {
      this.data.discordMessageIDs = [];
      const id = user.discordIDS;
      console.log(id);

      if (this.data.datestamp) {
        setTimeout(
          async () => {
            try {
              const message = await (
                await DiscordClient.users.fetch(id)
              ).send({
                content: this.data.message,
                components: rows.discordButtons,
              });

              this.data.discordMessageIDs.push({
                userID: id,
                messageID: message.id,
                channel_id: message.channel.id,
              });
              await this.save();

              console.log(this.data.discordMessageIDs);
            } catch (e) {
              console.log(e);
            }
          },
          this.data.datestamp - Date.now() || 1000,
        );
      } else {
        const message = await (
          await DiscordClient.users.fetch(id)
        ).send({
          content: this.data.message,
          components: rows.discordButtons,
        });

        this.data.discordMessageIDs.push({
          userID: id,
          messageID: message.id,
          channel_id: message.channel.id,
        });
        await this.save();
        console.log(this.data.discordMessageIDs);
      }
    }

    if (this.data.function) {
      setTimeout(
        async () => await this.data.function(user),
        this.data.datestamp - Date.now() || 1000,
      );
    }

    if (
      this.data.editAfter &&
      (!this.data.alwaysUpdate
        ? this.data.alwaysUpdate !== this.data.updatedNow
        : true)
    ) {
      await this.executeTimers();
    }

    if (
      this.data.deleteAfter &&
      (!this.data.alwaysUpdate
        ? this.data.alwaysUpdate !== this.data.updatedNow
        : true)
    ) {
      await this.deleteTimers();
    }

    if (this.data.editAfter) {
      setTimeout(
        async () => {
          this.active = !this.data.editAfter || !this.data.deleteAfter;
          await this.save();
        },
        this.data.datestamp - Date.now() || 1000,
      );
    } else {
      this.active = !this.data.editAfter || !this.data.deleteAfter;
    }

    console.log(this);
  }

  async executeTimers() {
   this.data = (await Notification.findOneBy({ uuid: this.uuid })).data;

    if (this.data.editAfter) {
      const rows = this.buildButtonsArray(
        this.data.editedButtons || this.data.buttons,
      );

      setTimeout(
        async () => {
          if (this.data?.telegramMessageIDs?.length) {
            for (const message_data of this.data?.telegramMessageIDs || []) {
              await TelegramClient.api
                .editMessageText({
                  text: this.data.editedMessage || this.data.message,
                  chat_id: message_data.userID,
                  message_id: message_data.messageID,
                  parse_mode: "MarkdownV2",
                  disable_web_page_preview: true,
                  reply_markup: rows.telegramKeyboard,
                })
                .catch(() => {});
            }
          }

          if (this.data?.discordMessageIDs?.length) {
            for (const message_data of this.data.discordMessageIDs) {
              (
                await (
                  (await DiscordClient.channels.fetch(
                    message_data.channel_id,
                  )) as DMChannel
                ).messages.fetch(message_data.messageID)
              )
                .edit({
                  content: this.data.editedMessage || this.data.message,
                  components: rows.discordButtons,
                })
                .catch(() => {});
            }
          }

          await this.save();
        },
        this.data.editAfter + this.data.datestamp - Date.now() || 1000,
      );
    }
  }

  async deleteTimers() {
   this.data = (await Notification.findOneBy({ uuid: this.uuid })).data;
    console.log(this.data, "deleteTimers");
    setTimeout(
      async () => {
        try {
        this.active = false;
        await this.save();

        if (this.data?.telegramMessageIDs?.length) {
          for (const message_data of this.data.telegramMessageIDs) {
            await TelegramClient.api.deleteMessage({
              chat_id: message_data.userID,
              message_id: message_data.messageID,
            });
          }
        }

        if (this.data?.discordMessageIDs?.length) {
          for (const message_data of this.data.discordMessageIDs) {
            await (
              await (
                (await DiscordClient.channels.fetch(
                  message_data.channel_id,
                )) as DMChannel
              ).messages.fetch(message_data.messageID)
            ).delete();
          }
        }
      } catch (e) {
        console.log(e);
      }
      },
      this.data.deleteAfter + this.data.datestamp - Date.now() || 1000,
    );
  }

  buildButtonsArray(data: Array<Button> = this.data.buttons) {
    const telegramKeyboard = new InlineKeyboardBuilder();
    const discordButtons: ActionRowBuilder<ButtonBuilder>[] = [
      new ActionRowBuilder<ButtonBuilder>(),
    ];
    const discordButtonsArray: ButtonBuilder[] = [];

    for (const button of data || []) {
      telegramKeyboard
        .textButton({
          text: button.name,
          payload: button.id,
        })
        .row();

      discordButtonsArray.push(
        new ButtonBuilder()
          .setCustomId(button.id)
          .setLabel(button.name)
          .setStyle(ButtonStyle.Secondary),
      );
    }

    for (const button of discordButtonsArray) {
      if (discordButtons[discordButtons.length - 1].components.length >= 5) {
        discordButtons.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(button),
        );
      } else {
        discordButtons[discordButtons.length - 1].addComponents(button);
      }
    }

    return { telegramKeyboard, discordButtons };
  }
}
