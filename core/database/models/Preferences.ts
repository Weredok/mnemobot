import { BaseEntity, Column, Entity, ForeignKey, PrimaryColumn } from "typeorm";
import { User } from "./User.ts";
import { type DictionaryFilters } from "core";

interface ReviewOptions {
    // Сторона карточки для повторения
    side: "front" | "back";
    answer: {
        // Тип ответа: написание перевода, кнопка "знаю" или тип не указан
        type: "writting" | "button" | "no",
        // Автоудаление ответа
        delete: boolean;
        // Время автоудаления ответа
        time: number
    };
    // Автоматический режим
    auto: {
        enabled: boolean;
        // Интервал для автоматического режима
        interval: number;
        // В какую сторону откладывать слова в случае инактива
        to: "known" | "unknown" | "none";
    };
    sm2: {
        enabled: boolean;
        // Режим повторения по SM-2
        mode: "dynamic" | "static" | "custom" | "none";
        // Множитель повторения SM-2 (2.5 by default)
        sm2Interval: number;
    };
}

@Entity()
class Preferences extends BaseEntity {
    @ForeignKey(() => User)
    @PrimaryColumn("integer")
    id: number;

    @Column("text")
    language: string

    @Column("text", { default: "Russian" })
    // Предпочитаемый язык
    interfaceLanguage: "Russian" | "English";

    @Column("text", { default: "Telegram" })
    // Предпочитаемая платформа
    platfrom: "Telegram" | "Discord" | "None";

    @Column("text", { default: "None" })
    // Предпочтения по платформе (аккаунт)
    account: string;

    @Column("numeric", { default: 1000 * 60 * 5 })
    // Время бездействия, после которого все кнопки будут заблокированы
    // Минимум 1000 * 30
    // Максимум 1000 * 60 * 5
    idleTimeout: number

    @Column("boolean", { default: true })
    // Отправлять ли уведомления
    notifications: boolean;

    @Column("boolean", { default: true })
    // Отправлять ли рекомендации
    recomendations: boolean;

    @Column("simple-json")
    dictionaryFilters: DictionaryFilters

    @Column("simple-json", { nullable: true })
    review: ReviewOptions

    async init(user: User) {
        this.id = user.id
        this.language = user.languages[0];
        this.dictionaryFilters = {
            frequency: false,
            dateOfCreation: false,
            length: false,
            forgotten: false,
            polysemitic: false
        };
        this.review = {
            side: "back",
            auto: {
                enabled: true,
                interval: 10000,
                to: "unknown"
            },
            sm2: {
                enabled: true,
                mode: "none",
                sm2Interval: 2.5
            },
            "answer": {
                type: "writting",
                delete: false,
                time: 10000
            }
        };
        await this.save();
        return this
    }
}

export { Preferences }