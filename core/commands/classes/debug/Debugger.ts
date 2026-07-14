import { getCurrentQuota } from "core/ai/Renewal.ts";
import {
  Flashcard,
  Folder,
  Notification,
  Preferences,
  Session,
  Set,
  Spawn,
  User,
} from "database";
import { Log } from "database/models/Log.ts";
import { DiscordClient } from "discord";
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import { TelegramClient } from "telegram";

export class Debugger {
  user_id: number;
  platform: "discord" | "telegram" | "developer";
  discord_message_id: string;
  telegram_message_id: number;

  user: User;
  preferences: Preferences;
  flashcards: Array<Flashcard>;
  notifications: Array<Notification>;
  sessions: Array<Session>;
  spawns: Array<Spawn>;
  folders: Array<Folder>;
  sets: Array<Set>;
  logs: Array<Log>;

  constructor(
    user_id: number,
    platform?: "discord" | "telegram" | "developer",
    discord_message_id?: string,
    telegram_message_id?: number,
  ) {
    this.platform = platform;
    this.discord_message_id = discord_message_id;
    this.telegram_message_id = telegram_message_id;
    this.user_id = user_id;
  }

  async attach() {
    this.user = await User.findOneBy({ id: this.user_id });
    this.preferences = await Preferences.findOneBy({ id: this.user_id });
    this.flashcards = await Flashcard.find({ where: { user: this.user_id } });
    this.notifications = await Notification.find({
      where: { data: { userId: this.user_id } },
    });
    this.sessions = await Session.find({ where: { user: this.user_id } });
    this.spawns = await Spawn.find({ where: { userId: this.user_id } });
    this.folders = await Folder.find({ where: { user: this.user_id } });
    this.sets = await Set.find({ where: { user: this.user_id } });
    this.logs = await Log.find({ where: { author: { id: this.user_id } } });

    switch (this.platform) {
      case "discord":
        this.discord_message_id = !this.discord_message_id
          ? (
              await (
                await DiscordClient.users.fetch(this.user.discordIDS)
              ).send("Debugging session has started...")
            ).id
          : this.discord_message_id;
        break;
      case "telegram":
        this.telegram_message_id = !this.telegram_message_id
          ? (
              await TelegramClient.api.sendMessage({
                chat_id: this.user.telegramIDs[0],
                text: "Debugging session has started...",
              })
            ).message_id
          : this.telegram_message_id;
        break;
      case "developer":
        this.telegram_message_id = (
          await TelegramClient.api.sendMessage({
            chat_id: process.env.developer_telegram,
            text: `Debugging session has started... (${this.user.name}, ${this.user.id})`,
          })
        ).message_id;
        this.discord_message_id = (
          await (
            await DiscordClient.users.fetch(process.env.developer_discord)
          ).send(
            `Debugging session has started... (${this.user.name}, ${this.user.id})`,
          )
        ).id;
        break;
    }
  }

  async generateGeneralReport() {
    const now = Date.now();

    // 1. Пинг (Latency)
    const ping = {
      discord: DiscordClient.ws.ping, // Задержка WebSocket Discord
      telegram: 0, // У Telegram нет прямого .ping, можно измерить через API call
      db: 0, // Замерим ниже
    };

    const dbStart = Date.now();
    await User.query("SELECT 1"); // Легкий запрос для проверки БД
    ping.db = Date.now() - dbStart;

    // 2. Статистика контента
    const stats = {
      totalWords: this.flashcards.length,
      totalFolders: this.folders.length,
      totalSets: this.sets.length,
      activeSessions: this.sessions.filter((s) => s.endAt > now).length,
      pendingNotifications: this.notifications.filter((n) => n.active).length,
    };

    // 3. Аналитика использования (Performance/Efficiency)
    // Среднее время жизни лога или количество ошибок
    const errorLogs = this.logs.filter((l) => l.type === "error").length;
    const warningLogs = this.logs.filter((l) => l.type === "warning").length;

    const whenUserWas = this.user.lastAwaited;

    // AI Quota use
    const currentAiQuota = await getCurrentQuota(this.user.id, "gpt-4o-mini");
    const allRestrictions = this.user.aiRestrictions;
    const aiQuotaUse = allRestrictions.reduce(
      (prev, current) => prev + current.input + current.output,
      0,
    );

    // Расчет эффективности заполнения (если есть данные о создании)
    const recentFlashcards = this.flashcards.filter(
      (f) => f.createdAt > now - 86400000,
    ).length; // за 24ч

    // 4. "Здоровье" системы
    const report = {
      timestamp: new Date().toISOString(),
      quota: {
        current: currentAiQuota,
        use: aiQuotaUse,
        limit: allRestrictions.reduce(
          (prev, current) => prev + current.time,
          0,
        ),
      },
      user: {
        id: this.user.id,
        name: this.user.name,
        lastAwaited: whenUserWas,
      },
      logs: {
        warnings: warningLogs,
        errors: errorLogs,
      },
      content: {
        words: stats.totalWords,
        folders: stats.totalFolders,
        sets: stats.totalSets,
        activeSessions: stats.activeSessions,
        pendingNotifications: stats.pendingNotifications,
      },
      ping,
      stats,
      analysis: {
        storageEfficiency:
          stats.totalWords > 0
            ? (stats.totalSets / stats.totalWords).toFixed(2)
            : 0, // Слов на сет
        errorRate:
          this.logs.length > 0
            ? ((errorLogs / this.logs.length) * 100).toFixed(2) + "%"
            : "0%",
        recentActivity: recentFlashcards,
      },
    };

    return report;
  }

  async webhook() {
    const embeds: EmbedBuilder[] = [];
    const components: ActionRowBuilder<ButtonBuilder>[] = [];

    const report = await this.generateGeneralReport();

    const aboutUser = new EmbedBuilder()
      .setTitle("Debug info about user")
      .setAuthor({
        name: this.user.name,
        iconURL: await DiscordClient.users
          .fetch(this.user.discordIDS)
          .then((user) => user.displayAvatarURL()),
      })
      .setURL("https://discord.com")
      .addFields(
        {
          name: `IDs`,
          value: `Discord: ${this.user.discordIDS} \nTelegram: ${this.user.telegramIDs.join(", ")}`,
          inline: true,
        },
        { name: `Languages`, value: this.user.knowing + ``, inline: true },
        {
          name: `Used tokens`,
          value:
            String(report.quota.use) +
            ` \`apprx. ${report.quota.use * 0.00000019987254317}$\``,
          inline: true,
        },
        {
          name: `Quota`,
          value: `Current quota: ${report.quota?.current?.notice}\nRenewal: <t:${Math.round(report.quota?.current?.renewal / 1000)}:R>\nLimit I/O: ${report.quota.current?.input}/${report.quota?.current?.output} tokens\nSummary: ${report.quota.limit} tokens`,
          inline: true,
        },
        {
          name: `Content`,
          value: `Words: ${report.content.words}\nFolders: ${report.content.folders}\nSets: ${report.content.sets}\nActive sessions: ${report.content.activeSessions}\nPending notifications: ${report.content.pendingNotifications}`,
          inline: true,
        },
        {
          name: "Analysis",
          value: `Storage efficiency: ${report.analysis.storageEfficiency}\nError rate: ${report.analysis.errorRate}\nRecent activity: ${report.analysis.recentActivity}`,
          inline: true,
        },
      )
      .setColor("DarkButNotBlack");

    const aboutSystem = new EmbedBuilder()
      .setAuthor({
        name: await DiscordClient.users.client.user.username,
        iconURL: await DiscordClient.users.client.user.displayAvatarURL(),
      })
      .setTitle("Debug info about system")
      .setURL("https://discord.com")
      .addFields(
        {
          name: `Logs`,
          value: `Warnings: ${report.logs.warnings}\nErrors: ${report.logs.errors}`,
          inline: true,
        },
        {
          name: `Ping`,
          value: `Discord: ${report.ping.discord}\nTelegram: ${report.ping.telegram}\nDatabase: ${report.ping.db}`,
          inline: true,
        },
        {
          name: `Analysis`,
          value: `Error rate: ${report.analysis.errorRate}\nRecent activity (24h): ${report.analysis.recentActivity}`,
          inline: true,
        },
      )
      .setFooter({
        text: `Version: ${process.env.version} | ${process.env.database_name} | ${report.timestamp}`,
      })
      .setColor("DarkButNotBlack");

    await DiscordClient.users
      .fetch(
        this.platform === "developer"
          ? process.env.developer_discord
          : this.user.discordIDS,
      )
      .then(async (user) => {
      // Это отправит два сообщения. Если оба придут — значит, они оба "валидны".
      await user.send({ embeds: [aboutUser] });
await user.send({ embeds: [aboutSystem] });
      });
  }
}
