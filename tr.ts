import "./setup.ts";
import { CEFR, datasource, Flashcard, Preferences, Set, User, Folder } from "database";

// ==========================================
// 1. НАСТРОЙКИ СИМУЛЯТОРА
// ==========================================
const DAYS_TO_SIMULATE = 365;
const NEW_CARDS_PER_DAY = 20; // Имитируем темп C1 (20 слов в день)
const TOTAL_CARDS = 1000;
const PING_MOCK = 50; // Искусственный пинг базы (p)

type PersonalityType = "cyborg" | "normis" | "procrastinator";
type GroupType = "A" | "B" | "C";

interface TestProfile {
  name: string;
  personality: PersonalityType;
  group: GroupType;
  mode: "dynamic" | "static";
  percent: number;
}

// Матрица тестирования
const PROFILES: TestProfile[] = [
  { name: "Cyborg_A_0.5", personality: "cyborg", group: "A", mode: "dynamic", percent: 0.5 },
  { name: "Cyborg_B_0.8", personality: "cyborg", group: "B", mode: "dynamic", percent: 0.8 },
  { name: "Cyborg_C_Static", personality: "cyborg", group: "C", mode: "static", percent: 0.85 },
  
  { name: "Normis_A_0.5", personality: "normis", group: "A", mode: "dynamic", percent: 0.5 },
  { name: "Normis_B_0.8", personality: "normis", group: "B", mode: "dynamic", percent: 0.8 },
  { name: "Normis_C_Static", personality: "normis", group: "C", mode: "static", percent: 0.85 },

  { name: "Procrast_A_0.5", personality: "procrastinator", group: "A", mode: "dynamic", percent: 0.5 },
  { name: "Procrast_B_0.8", personality: "procrastinator", group: "B", mode: "dynamic", percent: 0.8 },
  { name: "Procrast_C_Static", personality: "procrastinator", group: "C", mode: "static", percent: 0.85 },
];

// ==========================================
// 2. ЛОГИКА "БИОЛОГИИ" ПОЛЬЗОВАТЕЛЕЙ
// ==========================================
function simulateUserBehavior(
  personality: PersonalityType,
  strength: number,
  percent: number,
  day: number
): { skippedDay: boolean; remembered: boolean; timeToAnswer: number } {
  const rand = Math.random();
  
  switch (personality) {
    case "cyborg":
      // Никогда не пропускает дни. Вспоминает всё, что сильнее 0.3. Отвечает за 2-3 секунды.
      return {
        skippedDay: false,
        remembered: strength >= 0.3,
        timeToAnswer: 2000 + Math.floor(Math.random() * 1000),
      };

    case "normis":
      // Пропускает каждый 7-й день. Возможны случайные "затмения" памяти (5% шанс забыть).
      return {
        skippedDay: day % 7 === 0,
        remembered: strength >= percent ? rand > 0.05 : rand > 0.5,
        timeToAnswer: 5000 + Math.floor(Math.random() * 3000),
      };

    case "procrastinator":
      // Случайно пропускает 20% дней (создает ком из долгов). Забывает часто. Думает долго.
      return {
        skippedDay: Math.random() > 0.8,
        remembered: strength >= percent ? rand > 0.2 : rand > 0.8,
        timeToAnswer: 12000 + Math.floor(Math.random() * 8000),
      };
  }
}

// ==========================================
// 3. ОСНОВНОЙ СКРИПТ ПРОГОНА
// ==========================================
async function runSimulation() {

  // Подготовка пользователей и карточек
  const testUsers: { profile: TestProfile; userId: number }[] = [];

  for (const [index, profile] of PROFILES.entries()) {
    const userId = index + 1;
    
    const user = new User();
    user.id = userId;
    user.awcTime = 5000; // Базовое среднее время ответа (для формулы dynamic)
    user.languages = ["English"];
    await user.save();

    const prefs = await new Preferences().init(user, false);
    prefs.percent = profile.percent;
    prefs.review.sm2.mode = profile.mode;
    await prefs.save();

    // Генерируем 1000 карточек для пользователя
    const cards: Flashcard[] = [];
    for (let i = 0; i < TOTAL_CARDS; i++) {
      const card = new Flashcard();
      card.front = [`Word_${profile.name}_${i}`];
      card.back = [`Translation_${i}`];
      card.user = userId;
      card.set = "sim_set";
      card.quality = [];
      cards.push(card);
    }
    await Flashcard.save(cards);

    testUsers.push({ profile, userId });
  }

  console.log(`🟢 Generated ${testUsers.length} profiles with ${TOTAL_CARDS} cards each.`);
  console.log("🚀 Starting time-travel simulation...\n");

  // Машина времени: переопределяем Date.now
  let simulatedTime = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  // Замени global.Date.now = ... на прямое переопределение:
Date.now = () => simulatedTime;

  // Хранилище метрик
  const metrics = testUsers.map((tu) => ({
    name: tu.profile.name,
    totalReviewsMade: 0,
    maxQueueReached: 0,
  }));

  // Временная петля
  for (let day = 1; day <= DAYS_TO_SIMULATE; day++) {
    simulatedTime += ONE_DAY;

    for (let i = 0; i < testUsers.length; i++) {
      const tu = testUsers[i];
      const metric = metrics[i];

      // Получаем все карточки юзера
      const allCards = await Flashcard.findBy({ user: tu.userId });
      
     // Разделяем на Новые и Повторяемые (ИСПРАВЛЕНО)
const newCards = allCards.filter((c) => Number(c.reviewCount) === 0);
const activeCards = allCards.filter((c) => Number(c.reviewCount) > 0);

      // Алгоритм выборки (по твоей логике)
      const dueReviews = activeCards.filter(
        (c) => c.calculateStrength() <= tu.profile.percent
      );

      // Симулируем "болезнь / лень" пользователя
      const behavior = simulateUserBehavior(tu.profile.personality, 1, tu.profile.percent, day);
      if (behavior.skippedDay) {
        continue; // Пользователь не открыл бота, карточки копятся
      }

      // Формируем очередь на сегодня (новые + долги)
      const todaysQueue = [
        ...newCards.slice(0, NEW_CARDS_PER_DAY),
        ...dueReviews,
      ];

      // Логируем максимальную очередь (снежный ком)
      if (todaysQueue.length > metric.maxQueueReached) {
        metric.maxQueueReached = todaysQueue.length;
      }

      // Прокликиваем карточки
      for (const card of todaysQueue) {
        // Оцениваем память конкретной карточки
        const currentStrength = card.reviewCount === 0 ? 1 : card.calculateStrength();
        const response = simulateUserBehavior(tu.profile.personality, currentStrength, tu.profile.percent, day);
        
        // Вызываем твой реальный метод из модели
        await card.review(response.remembered, PING_MOCK, response.timeToAnswer);
        metric.totalReviewsMade++;
      }
    }

    // Индикатор прогресса в консоль (раз в 30 дней)
    if (day % 30 === 0) console.log(`⏳ Simulated Day ${day}/${DAYS_TO_SIMULATE}...`);
  }

  // ==========================================
  // 4. СБОР И АНАЛИЗ РЕЗУЛЬТАТОВ
  // ==========================================
  console.log("\n📊 === РЕЗУЛЬТАТЫ СИМУЛЯЦИИ (365 ДНЕЙ) ===\n");
  
  for (let i = 0; i < testUsers.length; i++) {
    const tu = testUsers[i];
    const metric = metrics[i];
    
    // Смотрим реальный прогресс
    const allCards = await Flashcard.findBy({ user: tu.userId });
    
    // Слово считается "выученным", если интервал перевалил за 21 день
    const learnedCards = allCards.filter(c => c.halfLifeHours > (24 * 21)).length;
    // Сколько карточек застряло в "дне сурка" (повторяются, но интервал мелкий)
    const stuckCards = allCards.filter(c => c.reviewCount > 5 && c.halfLifeHours <= (24 * 3)).length;

    console.log(`👤 Профиль: ${tu.profile.name}`);
    console.log(`   🔸 Выучено слов (>21 дня): ${learnedCards} / ${TOTAL_CARDS}`);
    console.log(`   🔸 Застряло (учатся, но забываются): ${stuckCards}`);
    console.log(`   🔸 Суммарно нажатий кнопок за год: ${metric.totalReviewsMade}`);
    console.log(`   🔸 Макс. размер очереди в день (снежный ком): ${metric.maxQueueReached}\n`);
  }

  process.exit(0);
}

runSimulation().catch(console.error);