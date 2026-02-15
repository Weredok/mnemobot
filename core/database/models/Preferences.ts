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

// Настройки поведения системы, действующие во время добавления или массовой загрузки в словарь
interface EnterOptions {
    // Тип ввода перевода 
    enterringTranslateType: EnterManageOptions,
    // Генерация примера   
    generateExampleType: EnterManageOptions,
    // Предпочитаемый язык ввода
    selectSourceLanguageType: EnterManageOptions,
    // Предпочитаемый язык-цель
    selectTargetLanguageType: EnterManageOptions,
    // Поведение автосохранения
    autoSave: boolean,
    // Искать ли перевод в глобальной базе данных перед тем, как делать автозапрос в ИИ
    searchGlobalBeforeAI: boolean,
    // Искать ли перевод в глобальной базе данных перед тем, как спрашивать пользователя мануальный перевод
    searchGlobalBeforeManual: boolean,
    // Модель для генерации ответов (настраивает разработчик)
    model: string,
    // Первый период для повторения
    firstIntervalReview: number, 
}

export enum EnterManageOptions {
    // Всегда использовать ИИ
    AlwaysAi, 
    // Всегда требовать ручной ввод
    AlwaysManual,
    // Всегда спрашивать поведение
    Ask, 
    // Ждать ручной ввод перед автоматическим
    WaitForManualBeforeAuto,
    // Не использовать
    Never, 
    // Отключено
     Disabled
}

@Entity()
class Preferences extends BaseEntity {
    @ForeignKey(() => User)
    @PrimaryColumn("integer")
    // Айди пользователя, чьи настройки сохраняются
    id: number;

    @Column("text")
    // Язык
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
    // Время бездействия, после которого все кнопки будут заблокированы, а сообщения - удалены
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
    // Настройки работы словаря
    dictionaryFilters: DictionaryFilters

    @Column("simple-json", { nullable: true })
    // Настройки поведения во время повторения слов (самое частое)
    review: ReviewOptions

    @Column("text", { nullable: true })
    // Последний язык, который использовался пользователем для изучения
    lastTarget: string

    @Column("simple-json", { nullable: true })
    // Автоматический перевод
    enter: EnterOptions

    @Column("boolean", { default: true })
    // При поиске в глобальной базе данных данные пользовтеля будут скрыты
    anonymous: boolean;

    async init(user?: User, save = true) {
        this.id = user?.id || 29929292
        this.language = user ? user?.languages[0] :  "English";
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
                mode: "dynamic",
                sm2Interval: 2.5
            },
            "answer": {
                type: "writting",
                delete: false,
                time: 10000
            }
        };
        this.lastTarget = "English";
        this.enter = {
            enterringTranslateType: EnterManageOptions.Ask,
            generateExampleType: EnterManageOptions.Ask,
            selectSourceLanguageType: EnterManageOptions.Ask,
            selectTargetLanguageType: EnterManageOptions.Ask,
            autoSave: true,
            searchGlobalBeforeAI: true,
            searchGlobalBeforeManual: true,
            model: "gpt-3.5-turbo",
            firstIntervalReview: 10000
        }
        if(user) await this.save();
        return this
    }
}

export { Preferences }