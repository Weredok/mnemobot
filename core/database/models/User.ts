import {
  BaseEntity,
  Column,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Preferences } from "./Preferences.ts";
import { Flashcard } from "./Flashcard.ts";
import { Location } from "commands/classes/StartMenu.ts";

export enum CEFR {
  A1 = "A1",
  A2 = "A2",
  B1 = "B1",
  B2 = "B2",
  C1 = "C1",
  C2 = "C2",
}

export interface AiUsageRecord {
  timestamp: number;
  usage: {
    output: number;
    input: number;
  };
  model: string;
  output_text: string;
  input_text: string;
  ping: number;
}

export interface AiUsageQuota {
  notice: string;
  timestamp: number;
  time: number;
  renewal: number;
  model: string;
  output: number;
  input: number;
}

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column("float", { default: 7500 })
  // Среднее время ответа на карточку с оценкой "5"
  awcTime: number;

  @Column("numeric", { default: 0 })
  // Количество повторенных слов суммарно
  wordsTotal: number;

  @Column("simple-array", { nullable: true })
  // Сессии пользователя по повторению слов
  sessions: string[];

  @Column("simple-array", { nullable: true })
  // Сеты пользователя
  sets: string[];

  @Column("simple-array", { nullable: true })
  // Языки пользователя
  languages: string[];

  @Column("text", { array: true, default: [] })
  // Список Telegram-аккаунтов
  telegramIDs: number[];

  @Column("text", { nullable: true })
  // Список Discord-аккаунтов
  discordIDS: string;

  // CEFR-уровни знания изучаемых языков
  @Column("simple-json", { nullable: true })
  knowing: {
    [key: string]: CEFR;
  };

  @Column("numeric", { default: 0 })
  lastAwaited: number;

  // AI-использование
  @Column("simple-json", { nullable: true })
  aiUsing: AiUsageRecord[];

  @Column("simple-json", { nullable: true })
  aiRestrictions: AiUsageQuota[];

  @Column("simple-json", { nullable: true })
  aiModelSelecting: {};

  @Column("numeric", { default: Date.now() })
  registeredAt: number;

  @Column("boolean", { default: false })
  reviewing: boolean;

  @Column("text", { nullable: false, default: "0" })
  password: string;

  @Column("text", { nullable: true })
  name: string;

  async askForSignUp() {
    // unreleased rn
  }

  async getFlashcards(options: GetFlashcardsOptions) {
    const query = Flashcard.createQueryBuilder("flashcard");

    // 1. Базовый фильтр по пользователю
    query.where("flashcard.user = :userId", { userId: options.userId });

    // 2. Исключения (excludeIds)
    if (options.excludeIds && options.excludeIds.length > 0) {
      query.andWhere("flashcard.id NOT IN (:...excludeIds)", {
        excludeIds: options.excludeIds,
      });
    }

    // 3. Фильтр по наборам (setIds)
    if (options.setIds && options.setIds.length > 0) {
      query.andWhere("flashcard.set IN (:...setIds)", {
        setIds: options.setIds,
      });
    }

    // 4. Логика SM-2 (onlyDueForReview)
    // Условие: (сейчас - последнее повторение в часах) >= halfLifeHours
    if (options.onlyDueForReview) {
      const nowHours = Date.now() / 3_600_000;
      query.andWhere(
        "(:nowHours - (flashcard.lastReviewed / 3_600_000)) >= flashcard.halfLifeHours",
        { nowHours },
      );
    }

    // 5. Сортировка
    options.sortBy.forEach((option => {
    switch (option) {
      case Location.SpawnFilterQualityASC:
        query.addSelect(
          "(SELECT AVG(val::numeric) FROM unnest(string_to_array(flashcard.quality, ',')) AS val)",
          "avg_quality",
        );
        query.orderBy("avg_quality", "ASC");
        break;
      case Location.SpawnFilterStrengthASC:
        query.orderBy("flashcard.strength", "ASC");
        break;
      case Location.SpawnFilterNewestFirst:
        query.orderBy("flashcard.createdAt", "DESC");
        break;
      case Location.SpawnFilterOldestFirst:
        query.orderBy("flashcard.createdAt", "ASC");
        break;
      case Location.SpawnFilterRandom:
        query.orderBy("RANDOM()");
        break;
    }
  }));

    // 6. Лимит
    if (options.limit) {
      query.take(options.limit);
    }

    return await query.getMany();
  }
}

export interface GetFlashcardsOptions {
  userId: number; // Чьи карточки ищем

  // Ограничение выборки (например, берем не больше 30 слов на сессию)
  limit?: number;

  // Ключевой параметр для SM-2. Если true — берем ТОЛЬКО те слова,
  // у которых: (Date.now() - lastReviewed) / 3_600_000 >= halfLifeHours
  onlyDueForReview?: boolean;

  // Фильтрация по конкретным наборам или папкам
  setIds?: string[];

  // Исключения (например, айди карточек, которые юзер уже прошел в текущей сессии 10 минут назад)
  excludeIds?: string[];

  // Как сортировать результат (важно, если limit отсекает часть слов)
  sortBy?: Location[]
}
