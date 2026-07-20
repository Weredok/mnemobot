import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class PublicReport {
  @PrimaryColumn("date", { unique: true })
  date: string; // Format: "YYYY-MM-DD"

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // AI Monitoring Block
  @Column("int", { default: 0 })
  aiRequestsCount: number;

  @Column("bigint", { default: 0 })
  aiInputTokens: number;

  @Column("bigint", { default: 0 })
  aiOutputTokens: number;

  @Column("int", { default: 0 }) stateCompleteCount: number;
  @Column("int", { default: 0 }) stateIncompleteCount: number;
  @Column("int", { default: 0 }) stateMixedCount: number;

  @Column("float", { default: 0 })
  aiCostUsd: number;

  // Database Usage Block
  @Column("int", { default: 0 })
  totalFlashcards: number;

  @Column("int", { default: 0 })
  flashcardsToday: number;

  @Column("int", { default: 0 })
  totalUsers: number;

  @Column("int", { default: 0 })
  usersToday: number;

  @Column("int", { default: 0 })
  totalNotifications: number;

  @Column("int", { default: 0 })
  notificationsToday: number;

  @Column("bigint", { default: 0 }) aiLatencySum: number;
  @Column("int", { default: 0 }) aiLatencyCount: number;
  @Column("int", { default: 0 }) aiLatencyMin: number;
  @Column("int", { default: 0 }) aiLatencyMax: number;

  @Column("bigint", { default: 0 }) dbLatencySum: number;
  @Column("int", { default: 0 }) dbLatencyCount: number;
  @Column("int", { default: 0 }) dbLatencyMin: number;
  @Column("int", { default: 0 }) dbLatencyMax: number;

  @Column("bigint", { default: 0 }) tgLatencySum: number; // Telegram
  @Column("int", { default: 0 }) tgLatencyCount: number;
  @Column("int", { default: 0 }) tgLatencyMin: number;
  @Column("int", { default: 0 }) tgLatencyMax: number;

  @Column("bigint", { default: 0 }) dsLatencySum: number; // Discord
  @Column("int", { default: 0 }) dsLatencyCount: number;
  @Column("int", { default: 0 }) dsLatencyMin: number;
  @Column("int", { default: 0 }) dsLatencyMax: number;

  // Analytics for mnemo Usage Block
  @Column("int", { default: 0 })
  platformDiscordCount: number;

  @Column("int", { default: 0 })
  platformTelegramCount: number;

  @Column("int", { default: 0 })
  inputMethodTextCount: number;

  @Column("int", { default: 0 })
  inputMethodFileCount: number;

  @Column("int", { default: 0 })
  inputQuantityBatchCount: number;

  @Column("int", { default: 0 })
  inputQuantitySingleCount: number;
}
