import { BaseEntity, Column, Entity, Exclusion, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Set } from "./Set.ts";
import { Flashcard } from "./Flashcard.ts";

interface ResponseInfo {
    // Айди карточки
    flashcard: string;
    // Сила карточки перед ответом
    strengthBefore: number;
    // Сила карточки после ответа
    strengthAfter: number;
    // Оценка
    quality: number;
    // Время, занятое для ответа
    time: number;
    // Время ответа
    at: number
}

@Entity()
class Session extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    // Уникальный айди сессии
    id: string;

    @PrimaryColumn("numeric")
    // Айди пользователя
    user: number;

    @Column("simple-array")
    // Массив ответов пользователя на протяжении сессии
    responses: ResponseInfo[]

    @Column("numeric", { default: Date.now() })
    // Время начала сессии
    startedAt: number

    @Column("numeric", { default: 0 })
    // Время окончания сессии
    endAt: number

    @Column("simple-array", { nullable: true })
    setIds: string[];

    @Column("simple-array", { select: false, nullable: true })
    query: Flashcard[];

    @Column("simple-array", { select: false, nullable: true })
    repeat: Flashcard[];

    async start(user: number, setIds: string[]) {
        this.user = user;
        this.setIds = setIds;
        this.startedAt = Date.now();
        await this.save();
        await this.querify()
        return this;
    };

    async next() {
        const flashcard = this.query.shift();
        await this.save();
        return flashcard;
    };

    async end() {
        this.endAt = Date.now();
        this.save();
        return this;
    }

    async querify() {
        const sets = (await Set.findBy({ user: this.user })).filter(set => this.setIds.includes(set.id));
        const flashcards: Flashcard[] = [];
        for (const set of sets) {
            for (const flashcard of set.flashcards) {
                flashcards.push(await Flashcard.findOneBy({ id: flashcard }));
            }
        }
        this.query = flashcards.sort((a, b) => a.strength - b.strength);
    };
}

export { Session, type ResponseInfo }