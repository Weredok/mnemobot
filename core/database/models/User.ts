import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum CEFR {
    A1 = "A1",
    A2 = "A2",
    B1 = "B1",
    B2 = "B2",
    C1 = "C1",
    C2 = "C2"
};

export interface AiUsageRecord {
    timestamp: number,
    usage: {
        output: number,
        input: number
    },
    model: string,
    output_text: string,
    input_text: string
    ping: number
};

export interface AiUsageQuota {
    notice: string,
    timestamp: number,
    time: number,
    renewal: number,
    model: string,
    output: number,
    input: number
}

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column("numeric", { default: 7500 })
    // Среднее время ответа на карточку с оценкой "5"
    awcTime: number;

    @Column("numeric", { default: 0 })
    // Количество повторенных слов суммарно
    wordsTotal: number;

    @Column("simple-array")
    // Сессии пользователя по повторению слов
    sessions: string[];

    @Column("simple-array")
    // Сеты пользователя
    sets: string[];

    @Column("simple-array")
    // Языки пользователя
    languages: string[];

    @Column("simple-array")
    // Список Telegram-аккаунтов
    telegramIDs: number[]

    @Column("text")
    // Список Discord-аккаунтов
    discordIDS: string

    // CEFR-уровни знания изучаемых языков
    @Column("simple-json", { nullable: true })
    knowing: {
        [key: string]: CEFR
    };

    @Column("numeric", { default: 0 })
    lastAwaited: number

    // AI-использование
    @Column("simple-json", { nullable: true })
    aiUsing: AiUsageRecord[]

    @Column("simple-json", { nullable: true })
    aiRestrictions: AiUsageQuota[]

    @Column("simple-json", { nullable: true })
    aiModelSelecting: {}

    
}