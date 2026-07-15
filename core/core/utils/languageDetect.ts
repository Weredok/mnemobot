const alphabets: Array<{ id: string; data: string[] }> = [
    {
      id: 'en',
      data: [
        'a','b','c','d','e','f','g','h','i','j','k','l','m',
        'n','o','p','q','r','s','t','u','v','w','x','y','z'
      ]
    },{
  id: 'de',
  data: [
    'a','b','c','d','e','f','g','h','i','j','k','l','m',
    'n','o','p','q','r','s','t','u','v','w','x','y','z',
    'ä','ö','ü','ß'
  ]
},
    {
      id: 'ru',
      data: [
        'а','б','в','г','д','е','ё','ж','з','и','й','к','л','м','н',
        'о','п','р','с','т','у','ф','х','ц','ч','ш','щ','ъ','ы','ь','э','ю','я'
      ]
    },
    {
      id: 'uk',
      data: [
        'а','б','в','г','ґ','д','е','є','ж','з','и','і','ї','й','к','л','м','н',
        'о','п','р','с','т','у','ф','х','ц','ч','ш','щ','ь','ю','я'
      ]
    }
  ];
  
  
  /**
   * Компилирует набор символов в Set для быстрого поиска
   */
  function buildCharSets(
    langs: Array<{ id: string; data: string[] }>
  ): Record<string, Set<string>> {
    const map: Record<string, Set<string>> = {};
    for (const { id, data } of langs) {
      map[id] = new Set(data.map(ch => ch.toLowerCase()));
    }
    return map;
  }
  
  /**
   * Определяет язык текста по наибольшему количеству совпадений символов
   * 
   * @param content — входная строка
   * @returns id языка или null, если определить не удалось
   */
 
function detectLanguages(
    content: string,
    threshold: number = 0.2
  ): string[] {
    const alphabetsMap = buildCharSets(alphabets);
    const counts: Record<string, number> = {};
    for (const lang of Object.keys(alphabetsMap)) {
      counts[lang] = 0;
    }
  
    // Подсчёт вхождений символов каждого языка
    for (const rawChar of content) {
      const ch = rawChar.toLowerCase();
      for (const [lang, charset] of Object.entries(alphabetsMap)) {
        if (charset.has(ch)) {
          counts[lang] += 1;
        }
      }
    }
  
    // Считаем общее число букв в тексте (игнорируем цифры, пробелы, пунктуацию)
    const totalLetters = Array.from(content)
      .filter(c => /[A-Za-zА-Яа-яЁёЇїЄєҐґІі]/.test(c))
      .length;
  
    if (totalLetters === 0) {
      return [];
    }
  
    // Находим максимальный счётчик
    const maxCount = Math.max(...Object.values(counts));
  
    // Если ни один язык не набрал хотя бы threshold доли букв, возвращаем пустой массив
    if (maxCount / totalLetters < threshold) {
      return [];
    }
  
    // Возвращаем все языки с этим максимальным счётом
    return Object.entries(counts)
      .filter(([, cnt]) => cnt === maxCount)
      .map(([lang]) => lang);
  }
  
  export { detectLanguages };