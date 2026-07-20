import { Notification, User } from "database";
import { LessThan, MoreThanOrEqual, And } from "typeorm";
import { Dispatcher } from "./Dispatcher.ts";
import { ExpiryPolicy } from "database";
import { ModelUpdaterWorker } from "./AvailableAiModels.ts";
import { AnalyticsService } from "./AnalyticsService.ts";
import { TelegramClient } from "telegram";

export class GlobalWorker {
  static scheduledTasks = new Set<string>();
  static activeTimers = new Map<string, NodeJS.Timeout>();

  static async start() {
    await this.tick(); 
    setInterval(() => this.tick(), 3 * 60 * 60 * 1000);

    const worker = new ModelUpdaterWorker();
    await worker.updateModels();

    setInterval(() => worker.updateModels(), 24 * 60 * 60 * 1000);

    await AnalyticsService.ensureTodayExists();
    
    await TelegramClient.api.sendMessage({
      chat_id: "@medsa_public_reports",
      text: await AnalyticsService.generateReportString(),
      parse_mode: "HTML"
    });

  }

  static async tick() {
    const now = Date.now();
    const threeHoursLater = now + 3 * 60 * 60 * 1000;

    // 1. Обработка просроченных уведомлений
    const overdue = await Notification.find({ 
        where: { active: true, data: { datestamp: LessThan(now) } } 
    });
    
    for (const note of overdue) {
        if (note.expiryPolicy === ExpiryPolicy.SendImmediately) await note.send();
        note.active = false;
        await note.save();
    }

    // 2. Планирование новых задач через Dispatcher
    // Здесь мы должны пробежаться по всем активным юзерам
    const activeUsers = await User.find(); // Или кэшированный список
    for (const user of activeUsers) {
        const dispatcher = new Dispatcher(user);
        await dispatcher.planNextThreeHours(now, threeHoursLater);
    }

    // 3. Запуск запланированных в БД уведомлений
    const upcoming = await Notification.find({
        where: { active: true, data: { datestamp: And(MoreThanOrEqual(now), LessThan(threeHoursLater)) } }
    });

    for (const note of upcoming) {
        if (this.scheduledTasks.has(note.uuid)) continue;

        const delay = Math.max(0, note.data.datestamp - now);
        const timer = setTimeout(async () => {
            await note.send();
            note.active = false;
            await note.save();
            this.scheduledTasks.delete(note.uuid);
            this.activeTimers.delete(note.uuid);
        }, delay);

        this.scheduledTasks.add(note.uuid);
        this.activeTimers.set(note.uuid, timer);
    }
  }
}