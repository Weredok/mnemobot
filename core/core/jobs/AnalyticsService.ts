import {
  datasource,
  Flashcard,
  PublicReport,
  User,
  Notification,
} from "database";

export type MetricType = "ai" | "db" | "tg" | "ds";
const interactionMappings = {
  platform: { tg: "platformTelegramCount", ds: "platformDiscordCount" },
  method: { text: "inputMethodTextCount", file: "inputMethodFileCount" },
  quantity: {
    batch: "inputQuantityBatchCount",
    single: "inputQuantitySingleCount",
  },
  state: {
    complete: "stateCompleteCount",
    incomplete: "stateIncompleteCount",
    mixed: "stateMixedCount",
  },
};

const getTrend = (today: number, avg: number): string => {
  if (avg === 0 && today > 0) return " ↑🔥";
  if (avg === 0) return "";

  const ratio = today / avg;
  if (ratio >= 1.5) return " ↑🔥";
  if (ratio >= 1.3) return " ↑";
  if (ratio <= 0.5) return " ↓🔥";
  if (ratio <= 0.7) return " ↓";
  return "";
};

const formatMetric = (
  label: string,
  today: number,
  avg: number,
  total?: number,
): string => {
  const trend = getTrend(today, avg);
  const atw = Math.round(avg);
  const totalDisplay = total !== undefined ? ` (Total: ${total})` : "";
  return `${label}: ${today}${trend} (ATW: ${atw})${totalDisplay}`;
};

export class AnalyticsService {
  static async generateReportString(): Promise<string> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const repo = datasource.getRepository(PublicReport);
    const todayData = await repo.findOneBy({ date: todayStr });
    if (
      todayData.totalFlashcards === 0 ||
      todayData.totalUsers === 0 ||
      todayData.totalNotifications === 0
    ) {
      const [fCount, uCount, nCount] = await Promise.all([
        datasource.getRepository(Flashcard).count(),
        datasource.getRepository(User).count(),
        datasource.getRepository(Notification).count(),
      ]);

      await repo.update(todayStr, {
        totalFlashcards: fCount,
        totalUsers: uCount,
        totalNotifications: nCount,
      });

      todayData.totalFlashcards = fCount;
      todayData.totalUsers = uCount;
      todayData.totalNotifications = nCount;
    }
    if (!todayData) return "No data for today yet.";

    const stats = await datasource
      .getRepository(PublicReport)
      .createQueryBuilder("report")
      .select('AVG("aiRequestsCount")', "avgAiReq")
      .addSelect('AVG("aiInputTokens")', "avgInput")
      .addSelect('AVG("aiOutputTokens")', "avgOutput")
      .addSelect('AVG("flashcardsToday")', "avgFlashcards")
      .addSelect('AVG("usersToday")', "avgUsers")
      .addSelect('AVG("notificationsToday")', "avgNotifs")
      .where("date < :today", { today: todayStr })
      .andWhere("date >= (CURRENT_DATE - INTERVAL '7 days')")
      .getRawOne();
    const dateFormatted = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    return [
      `<b>${dateFormatted}</b>, that one day for mnemo ${process.env.stage}.\n`,
      `<b><u>AI Monitoring usage</u></b>`,
      formatMetric(
        "<i>API requests</i>",
        todayData.aiRequestsCount,
        stats.avgAiReq || 0,
      ),
      `<i>Tokens used (i/o)</i>: ${todayData.aiInputTokens} / ${todayData.aiOutputTokens} (ATW: ${Math.round(stats.avgInput || 0)} / ${Math.round(stats.avgOutput || 0)})`,
      `<i>Estimated cost</i>: $${todayData.aiCostUsd}`,
      `<i>Average Latency</i>: ${Math.round(todayData.aiLatencySum / todayData.aiLatencyCount)}ms\n`,
      `<b><u>Database usage</u></b>`,
      formatMetric(
        "<i>Total Flashcards</i>",
        todayData.flashcardsToday,
        stats.avgFlashcards || 0,
        todayData.totalFlashcards,
      ),
      formatMetric(
        "<i>Total Users</i>",
        todayData.usersToday,
        stats.avgUsers || 0,
        todayData.totalUsers,
      ),
      formatMetric(
        "<i>Total Notifications</i>",
        todayData.notificationsToday,
        stats.avgNotifs || 0,
        todayData.totalNotifications,
      ),
      ``,
      `<b><u>Analytics for mnemo usage</u></b>`,
      `<i>Platform usage % (d/t)</i>: ${this.calcPercent(todayData.platformDiscordCount, todayData.platformTelegramCount)}`,
      `<i>Text/File input %</i>: ${this.calcPercent(todayData.inputMethodTextCount, todayData.inputMethodFileCount)}`,
      `<i>Batch/Single input %</i>: ${this.calcPercent(todayData.inputQuantityBatchCount, todayData.inputQuantitySingleCount)}`,
      `<i>Completed/Incompleted input %</i>: ${todayData.stateCompleteCount}/${todayData.stateIncompleteCount} (mixed ${todayData.stateMixedCount})`,
      `\n <code>Version: ${process.env.version}</code>`
    ].join("\n");
  }

  private static calcPercent(valA: number, valB: number): string {
    const total = valA + valB;
    if (total === 0) return "0/0";
    const pA = Math.round((valA / total) * 100);
    const pB = 100 - pA;
    return `${pA}/${pB}`;
  }
  static async recordLatency(type: MetricType, ping: number) {
    await this.ensureTodayExists();
    const today = new Date().toISOString().split("T")[0];
    const reportRepository = datasource.getRepository(PublicReport);

    await reportRepository
      .createQueryBuilder()
      .update(PublicReport)
      .set({
        [`${type}LatencySum`]: () => `${type}LatencySum + ${ping}`,
        [`${type}LatencyCount`]: () => `${type}LatencyCount + 1`,
        [`${type}LatencyMin`]: () =>
          `CASE WHEN ${type}LatencyMin = 0 THEN ${ping} ELSE LEAST(${type}LatencyMin, ${ping}) END`,
        [`${type}LatencyMax`]: () => `GREATEST(${type}LatencyMax, ${ping})`,
      })
      .where("date = :date", { date: today })
      .execute();
  }

  static async ensureTodayExists() {
    const date = new Date().toISOString().slice(0, 10);
    await datasource.query(
      `
            INSERT INTO public_report (date) VALUES ($1) 
            ON CONFLICT (date) DO NOTHING
        `,
      [date],
    );
  }

  static async recordInteraction(
    platform: "tg" | "ds",
    method: "text" | "file",
    quantity: "batch" | "single",
    state: "complete" | "incomplete" | "mixed",
  ) {
    await this.ensureTodayExists();
    const date = new Date().toISOString().slice(0, 10);

    const setPayload: Record<string, () => string> = {};

    const addMetric = (
      category: keyof typeof interactionMappings,
      value: string,
    ) => {
      const columnName = interactionMappings[category][value];
      if (columnName) {
        setPayload[columnName] = () => `${columnName} + 1`;
      }
    };

    addMetric("platform", platform);
    addMetric("method", method);
    addMetric("quantity", quantity);
    addMetric("state", state);

    await datasource
      .getRepository(PublicReport)
      .createQueryBuilder()
      .update()
      .set(setPayload)
      .where("date = :date", { date })
      .execute();
  }

  static async recordAiUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
  ) {
    await this.ensureTodayExists();
    const date = new Date().toISOString().slice(0, 10);

    await datasource
      .getRepository(PublicReport)
      .createQueryBuilder()
      .update()
      .set({
        aiRequestsCount: () => "aiRequestsCount + 1",
        aiInputTokens: () => `aiInputTokens + ${inputTokens}`,
        aiOutputTokens: () => `aiOutputTokens + ${outputTokens}`,
        aiCostUsd: () => `aiCostUsd + ${cost}`,
      })
      .where("date = :date", { date })
      .execute();
  }

  static async recordEvent(type: "flashcard" | "user" | "notification") {
    await this.ensureTodayExists();
    const date = new Date().toISOString().slice(0, 10);
    const column = `${type}sToday`;

    await datasource
      .getRepository(PublicReport)
      .createQueryBuilder()
      .update()
      .set({
        [column]: () => `${column} + 1`,
      })
      .where("date = :date", { date })
      .execute();
  }
}
