import {
  BaseEntity,
  Column,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Set } from "./Set.ts";
import { User } from "./User.ts";
import { MinKey } from "typeorm/browser";
import { Preferences } from "./Preferences.ts";
import { EmbedBuilder } from "discord.js";

@Entity()
class Flashcard extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  // Уникальный айди этой карточки
  id: string;

  // Айди набора, к которому относится эта карточка
  @Column("text", { nullable: true })
  set: string;

  // Одна из сторон (фронт)
  @Column("simple-array", { nullable: false })
  front: string[];

  // Одна из сторон (бэк)
  @Column("simple-array", { nullable: false })
  back: string[];

  // Последние оценки за эту карточку
  @Column("simple-array")
  quality: number[];

  // Количество повторений (без интервального повторения)
  @Column("numeric", { default: 0 })
  reviewCount: number;

  // Количество повторений (с интервальным повторением)
  @Column("numeric", { default: 0 })
  intervalReviewCount: number;

  // Текущая "сила" карточки
  @Column("numeric", { default: 1 })
  strength: number;

  // Время последнего повторения
  @Column("numeric", { default: 0 })
  lastReviewed: number;

  // Через сколько времени эта карточка может быть забыта на 50%
  @Column("numeric", { default: 48 })
  halfLifeHours: number;

  // Время создания карточки
  @Column("numeric", { default: Date.now() })
  createdAt: number;

  // Пользователь
  @Column("numeric", { nullable: false })
  user: number;

  async review(c: boolean, p: number, t: number) {
    /**
     * c - правильность ответа
     * p - пинг бд + системы + бота
     * t - время на ответ
     * q - оценка
     * awc - среднее время ответа пользователя для оценки "5"
     * w - время ответа с вычетом awc
     * m - максимальное время для ответа
     */

    const user = await User.findOneBy({ id: this.user });
    const preferences = await Preferences.findOneBy({ id: user.id });
    const type = preferences.review.sm2.mode;
    let q: number = 1;
    let awc: number = user.awcTime;
    let w: number = t - (awc - p);
    let m: number = 4 * (awc + p);

    switch (type) {
      case "dynamic":
        q = (5 - 4 / (Math.min(w, m) / m)) * Number(c);
        break;
      case "static":
        if (c && t < 5000) {
          q = 5;
        } else if (c && t < 10000) {
          q = 4;
        } else if (c && t < 15000) {
          q = 3;
        } else if (c && t < 20000) {
          q = 2;
        } else {
          q = 1;
        }
        break;

      case "custom":
        //not supported now
        break;
      case "none":
        q = 5;
    }
    if (q === 0) q = 1;
    if (q > 5) q = 5;
    this.quality.push(q);
    this.reviewCount++;
    this.intervalReviewCount++;
    this.lastReviewed = Date.now();
    this.strength = 1 - 0.2 * (5 - q);

    // Рассчёт следующего интервала
    switch (type) {
      case "dynamic":
        const baseHours = 24 * 2.5;
        const growth = 1.3 + 0.25 * this.strength;

        this.halfLifeHours =
          baseHours *
          Math.pow(growth, this.intervalReviewCount) *
          this.strength;

        // Защита от слишком большого интервала
        this.halfLifeHours = Math.min(
          this.halfLifeHours,
          24 * 365, // 1 год
        );
        break;

      case "static":
        this.halfLifeHours = Math.min(
          Math.max(this.halfLifeHours * 2.3, 12),
          24 * 365 * 10,
        );
        break;

      case "custom":
        //not supported now
        break;

      case "none":
        this.halfLifeHours = 0;
    }
    await this.save();
    0;

    return { q, awc, w, m, c, p, t, type };
  }

  calculateStrength() {
    const hoursSinceReview = (Date.now() - this.lastReviewed) / 3_600_000;

    return Math.exp(-hoursSinceReview / this.halfLifeHours);
  }

  buildInfoPayload(reverse: boolean = false, review_mode: boolean = false) {
    const embeds: EmbedBuilder[] = [];
    const components: { name: string; id: string }[] = [];
    let content: string;

    const embed = new EmbedBuilder()
      .setColor("White")
      .setDescription(
        `\n**Дата создания:** <t:${Math.floor(this.createdAt / 1000)}:R>\n**Дата последнего повторения**: <t:${Math.floor(this.lastReviewed / 1000)}:R>\n**Предпологаемая память**: ${this.calculateStrength() * 100}% (\`${this.reviewCount}\`)\n`,
      )
      .setFooter({
        text: this.quality.length
          ? `Последние оценки: (${this.quality.join(", ").slice(0, 3)})`
          : `Система не может оценить ваши знания этого слова`,
      });

    content = `\n**Дата создания:** ${new Date(this.createdAt).toLocaleString("ru-RU")}\n**Дата последнего повторения:** ${new Date(this.lastReviewed || this.createdAt).toLocaleString("ru-RU")}\n**Предпологаемая память**: ${this.calculateStrength() * 100}% (\`${this.reviewCount}\`)\n**${this.quality.length ? `**Последние оценки:** (${this.quality.join(", ").slice(0, 3)})` : `Система не может оценить ваши знания этого слова.`}`;

    if (review_mode) {
      embed
        .setTitle(this[reverse ? "back" : "front"].join(", "))
        .setDescription(
          embed.data.description +
            `\n**Перевод**: ||${this[reverse ? "front" : "back"].join(", ")}||`,
        );
      content =
        `**__${this[reverse ? "back" : "front"].join(", ")}__**\n\n` +
        content +
        `\n**Перевод**: ||${this[reverse ? "front" : "back"].join(", ")}||`;
    } else {
      embed.setTitle(
        `${this[reverse ? "back" : "front"].join(", ")}\n${this[reverse ? "front" : "back"].join(", ")}`,
      );
      content =
        `**__${this[reverse ? "back" : "front"].join(", ")}\n${this[reverse ? "front" : "back"].join(", ")}__**\n\n` +
        content;
    }

    embeds.push(embed);

    if (!review_mode) {
      components.push(
        {
          name: "Редактировать",
          id: `instant:flashcard:edit:${this.id}`,
        },
        {
          name: "Удалить",
          id: `instant:flashcard:delete:${this.id}`,
        },
      );
    }

    return { embeds, components, content };
  }
}

export { Flashcard };
