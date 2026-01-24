import {
  datasource,
  Flashcard,
  Notification,
  Preferences,
  User,
} from "database";
import { NotificationType } from "database/models/Notification.ts";
import { DiscordClient } from "discord";
import {
  Client,
  DMChannel,
  EmbedBuilder,
  Message as MessageDiscord,
} from "discord.js";
import { Message } from "openai/resources/beta/threads.mjs";
import { Message as MessageTelegram } from "puregram";
import { TelegramClient } from "telegram";
import {
  BaseEntity,
  Column,
  Entity,
  ForeignKey,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class Spawn extends BaseEntity {
  @ForeignKey(() => Notification)
  @PrimaryColumn("uuid")
  uuid: string;

  @Column("numeric")
  at: number;

  @Column("numeric")
  during: number;

  @Column({ type: "text" })
  platform: "telegram" | "discord";

  @Column("integer")
  userId: number;

  @Column("simple-array")
  flashcardIds: string[];

  user?: User;
  flashcards?: Array<Flashcard>;
  preferences?: Preferences;

  async initialize() {
    this.user = await User.findOneBy({ id: this.userId });

    if (this.flashcardIds) {
      this.flashcards = [];
      for (const id of this.flashcardIds) {
        const card = await Flashcard.findOneBy({ id });
        if (card) this.flashcards.push(card);
      }
    }

    this.preferences = await Preferences.findOneBy({ id: this.user.id });
  }

  async startInterval() {
    if (this.at >= Date.now()) {
      setTimeout(async () => {
        await this.ask();
      }, this.at - Date.now());
    } else if (Date.now() - this.at >= 1000 * 60 * 60 * 6) {
      await this.ask();
    } else {
   // r
    }
  }

  async ask() {
    await this.initialize();
    const notification = new Notification();
    notification.type = NotificationType.ReviewTime;
    notification.data = {
      userId: this.userId,
      deleteAfter: this.during,
      alwaysUpdate: false,
      updatedNow: false,
      message: "Time to review flashcards",
      buttons: [
        {
          name: `Review ${process.env.version}`,
          id: `instant:spawn:${this.uuid}:go`,
        },
      ],
    };

    await notification.save();

    await notification.send();
    this.uuid = notification.uuid;
    return notification;
  }

  async findNeedenFlashcards() {
    await this.initialize();
    if (this.flashcardIds?.length !== 0 || this.flashcards?.length !== 0)
      return;
    let flashcards = await Flashcard.findBy({ user: this.user.id });
    flashcards = flashcards.sort(
      (a, b) => b.calculateStrength() - a.calculateStrength(),
    );

    this.flashcardIds = flashcards.map((flashcard) => flashcard.id);
    this.flashcards = flashcards;
    return flashcards;
  }

  async do(
    step: number = 1,
    meta: { platform: "discord" | "telegram"; userId: string | number },
    side: "front" | "back",
    message?: MessageDiscord | MessageTelegram,
    notification?: Notification,
  ) {
    await this.initialize();
    if (!this.flashcards.length) await this.findNeedenFlashcards();

    const flashcard = this.flashcards[step - 1];

    if (!notification) {
      notification = await Notification.findOneBy({ uuid: this.uuid });
    }

    await notification.deleteTimers();

    const { embeds, components, content } = flashcard.buildInfoPayload(
      side === "front",
      true,
    );
    const { telegramKeyboard, discordButtons } =
      notification.buildButtonsArray(components);

    if (meta.platform === "discord") {
      const user = await DiscordClient.users.fetch(meta.userId as string);

      this.user.reviewing = true;
      await this.user.save();

      if (!message) {
        message = await user.send({
          embeds,
          components: discordButtons[0]?.components?.length
            ? discordButtons
            : [],
        });
      } else {
        if (message instanceof MessageDiscord)
          await message.edit({
            embeds,
            components: discordButtons[0]?.components?.length
              ? discordButtons
              : [],
          });
      }

      if (message instanceof MessageTelegram) return;

      const datetime = Date.now();
      await (message.channel as DMChannel)
        .awaitMessages({
          filter: (m) => m.author.id === meta.userId,
          max: 1,
          time: this.preferences.idleTimeout,
          errors: ["time"],
        })
        .then(async (collection) => {
          const userAnswer = collection.first();
          const answer = userAnswer.content;
          const isCorrect =
            answer.toLowerCase().replaceAll(" ", "").replaceAll(".", "") ===
            flashcard[side][0]
              .toLowerCase()
              .replaceAll(" ", "")
              .replaceAll(".", "");

          const start = performance.now();
          await datasource.query("SELECT 1");
          const pingMsDb = performance.now() - start;

          const {
            p: ping,
            q: quality,
            c: correct,
            awc: averageTime,
            w: timeWithoutAwc,
            t: timeForResponse,
            m: maxTimeForAnswer,
            type,
          } = await flashcard.review(
            isCorrect,
            DiscordClient.ws.ping + pingMsDb,
           Date.now() - datetime,
          );

          await (message as MessageDiscord).reply({
            content: `\`\`\`js\nCollectedVariables(Spawn.do() => void):\n\nAnswerIsCorrect: ${correct}\nPing: ${ping}\nQuality: ${quality}\nAverageTime: ${averageTime}\nTimeWithoutAwc: ${timeWithoutAwc}\nTimeForResponse: ${timeForResponse}\nMaxTimeForAnswer: ${maxTimeForAnswer}\nStartTime: ${datetime}\nEndTime: ${Date.now()}\nPingDbMs: ${pingMsDb}\nRevSM2Type: ${type}\n\n\`\`\``,
          });

          await this.do(step + 1, meta, side, message);
        });
    } else if (meta.platform === "telegram") {
      // not used rn, only for design review
      await TelegramClient.api.sendMessage({
        chat_id: meta.userId as number,
        reply_markup: telegramKeyboard,
        text: content,
        parse_mode: "Markdown",
      });
    }
  }
}
