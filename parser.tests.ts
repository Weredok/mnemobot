// test-parser.ts

// Полный набор сплиттеров из твоих preferences
const splitters = {
  ForProvidingBatchOfSentences: ";",
  ForProvidingBatchOfWords: "\\n",
  ForProvidingSynonyms: ", ",
  ForProvidingExamples: "//",
  ForSingleWordWithProvidedTranslation: " - ",
};

/**
 * Автономная функция парсинга с поддержкой примеров и синонимов
 */
function parseInput(data: string) {
  const result: Array<{
    front: string[];
    back: string[];
    examples?: string[];
  }> = [];

  const batchRegex = new RegExp(splitters.ForProvidingBatchOfWords);
  const sentenceRegex = new RegExp(splitters.ForProvidingBatchOfSentences);
  
  // Создаем регулярку для перевода. Скобки () сохраняют сам сплиттер в массиве после split
  const translationRegex = new RegExp(
    `\\s*(${splitters.ForSingleWordWithProvidedTranslation})\\s*`
  );

  const exampleSplitter = splitters.ForProvidingExamples;
  const synonymSplitter = splitters.ForProvidingSynonyms;

  const lines = data.split(batchRegex);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const sentences = line.split(sentenceRegex);

    for (let j = 0; j < sentences.length; j++) {
      const itemText = sentences[j].trim();
      if (!itemText) continue;

      // 1. Отделяем примеры от основной части карточки
      let mainPart = itemText;
      const examples: string[] = [];

      if (itemText.includes(exampleSplitter)) {
        const partsWithExample = itemText.split(exampleSplitter);
        mainPart = partsWithExample[0].trim();
        
        // Все, что идет после первого "//", считаем примерами
        for (let e = 1; e < partsWithExample.length; e++) {
          const ex = partsWithExample[e].trim();
          if (ex) examples.push(ex);
        }
      }

      // 2. Разбираем основную часть (front и back)
      const parts = mainPart.split(translationRegex);

      if (parts.length > 1 && parts[1]) {
        // Есть перевод. Разбиваем на синонимы с помощью ForProvidingSynonyms (", ")
        const front = parts[0]
          .split(synonymSplitter)
          .map((s) => s.trim())
          .filter(Boolean);
          
        const back = parts[parts.length - 1]
          .split(synonymSplitter)
          .map((s) => s.trim())
          .filter(Boolean);
          
        result.push({ 
          front, 
          back, 
          examples: examples.length > 0 ? examples : undefined 
        });
      } else {
        // Перевода нет (ожидает AI). Разбиваем только front на синонимы
        const front = mainPart
          .split(synonymSplitter)
          .map((s) => s.trim())
          .filter(Boolean);
          
        result.push({ 
          front, 
          back: [], 
          examples: examples.length > 0 ? examples : undefined 
        });
      }
    }
  }

  return result;
}

// ==========================================
// БЛОК ТЕСТИРОВАНИЯ ВСЕХ СПЛИТТЕРОВ
// ==========================================

const testCases = [
  {
    name: "1. Одиночное слово с переводом и примером",
    input: "hello world - привет мир // И он сказал: Привет мир!"
  },
  {
    name: "2. Синонимы (через запятую с пробелом)",
    input: "dog, hound - собака, пёс"
  },
  {
    name: "3. Батч из предложений + примеры",
    input: "apple - яблоко // I eat an apple; orange - апельсин // I like oranges // It is orange"
  },
  {
    name: "4. Батч из слов (перенос строки) с неполным вводом (для AI)",
    input: "hello, hi - привет, здрасте\ncar, automobile // My car is fast"
  },
  {
    name: "5. Строгий тест сплиттера синонимов (запятая без пробела не должна резать слово)",
    input: "1,000 - тысяча"
  }
];

console.log("🚀 Запуск тестов обновленного парсера...\n");

testCases.forEach((tc, index) => {
  console.log(`\x1b[34m[Test ${index + 1}] ${tc.name}\x1b[0m`);
  console.log(`Input: ${JSON.stringify(tc.input)}`);
  
  const parsed = parseInput(tc.input);
  
  console.log("Output:");
  console.dir(parsed, { depth: null, colors: true });
  console.log("-".repeat(50) + "\n");
});