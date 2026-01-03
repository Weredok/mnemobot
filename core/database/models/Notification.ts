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

enum NotificationType {
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
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column("simple-enum", { enum: NotificationType })
  type: NotificationType;

  @Column("boolean")
  active: boolean;

  @Column("simple-json")
  data: {
    userId: number;
    message: string;
    buttons?: Array<Button>;
    datestamp?: number;

    telegramMessageIDs?: Array<{ userID: number; messageID: number }>;
    discordMessageIDs?: Array<{
      userID: string;
      messageID: string;
      channel_id?: string;
    }>;

    deleteAfter?: number;
    deleteButtonsAfter?: number;

    editAfter?: number;
    editButtonsAfter?: number;
    editedMessage?: string;
    editedButtons?: Array<Button>;

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

              this.data.telegramMessageIDs.push({
                userID: id,
                messageID: message.message_id,
              });
            } catch {}
          },
          this.data.datestamp - Date.now() || 1000
        );
      }
    }

    if (user.discordIDS.length > 0) {
      this.data.discordMessageIDs = [];
      const id = user.discordIDS;
      console.log(id);
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

            console.log(this.data.discordMessageIDs);
          } catch (e) {
            console.log(e);
          }
        },
        this.data.datestamp - Date.now() || 1000
      );
    }

    if (this.data.function) {
      setTimeout(
        async () => await this.data.function(user),
        this.data.datestamp - Date.now() || 1000
      );
    }

    if (this.data.editAfter) {
      await this.executeTimers();
    }

    if (this.data.deleteAfter) {
      await this.deleteTimers();
    }

    setTimeout(
      async () => {
        this.active = false;
        await this.save();
      },
      this.data.datestamp - Date.now() || 1000
    );
  }

  async executeTimers() {
    if (this.data.editAfter) {
      const rows = this.buildButtonsArray(
        this.data.editedButtons || this.data.buttons
      );

      setTimeout(
        async () => {
          for (const message_data of this.data.telegramMessageIDs) {
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

          for (const message_data of this.data.discordMessageIDs) {
            (
              await (
                (await DiscordClient.channels.fetch(
                  message_data.channel_id
                )) as DMChannel
              ).messages.fetch(message_data.messageID)
            )
              .edit({
                content: this.data.editedMessage || this.data.message,
                components: rows.discordButtons,
              })
              .catch(() => {});
          }

          await this.save();
        },
        this.data.editAfter + this.data.datestamp - Date.now() || 1000
      );
    }
  }

  async deleteTimers() {
    setTimeout(
      async () => {
        this.active = false;
        await this.save();

        for (const message_data of this.data.telegramMessageIDs) {
          await TelegramClient.api.deleteMessage({
            chat_id: message_data.userID,
            message_id: message_data.messageID,
          });
        }

        for (const message_data of this.data.discordMessageIDs) {
          await (
            await (
              (await DiscordClient.channels.fetch(
                message_data.channel_id
              )) as DMChannel
            ).messages.fetch(message_data.messageID)
          ).delete();
        }
      },
      this.data.deleteAfter + this.data.datestamp - Date.now() || 1000
    );
  }

  buildButtonsArray(data: Array<Button> = this.data.buttons) {
    const telegramKeyboard = new InlineKeyboardBuilder();
    const discordButtons: ActionRowBuilder<ButtonBuilder>[] = [];

    for (const button of data || []) {
      telegramKeyboard
        .textButton({
          text: button.name,
          payload: button.id,
        })
        .row();

      discordButtons.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(button.id)
            .setLabel(button.name)
            .setStyle(ButtonStyle.Secondary)
        )
      );
    }

    return { telegramKeyboard, discordButtons };
  }
}
