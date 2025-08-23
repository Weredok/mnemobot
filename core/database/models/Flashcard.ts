import { BaseEntity, Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Set } from "./Set.ts";
import { User } from "./User.ts";
import { MinKey } from "typeorm/browser";

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
    @Column("simple-array",)
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
    user: number

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
        const set = await Set.findOneBy({ id: this.set })
        const user = await User.findOneBy({ id: set.user })
        let q: number = 1;
        let awc: number = user.awcTime;
        let w: number = t - (awc - p);
        let m: number = 4 * (awc + p);

        q = (5 - 4 / (Math.min(w, m) / m)) * Number(c);
        if (q === 0) q = 1;
        if (q > 5) q = 5;
        this.quality.push(q);
        this.reviewCount++;
        this.intervalReviewCount++
        this.lastReviewed = Date.now();
        this.strength = 1 - 0.2 * (5 - q);
        this.halfLifeHours = (3 * this.strength) * (24 * this.intervalReviewCount)
        await this.save()
    }
}

export { Flashcard }