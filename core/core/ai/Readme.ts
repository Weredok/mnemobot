
enum AiTargets {
    // Обычный перевод слова
    TranslateWord = 1,
    // Генерация набора с словами
    GenerateSet = 2,
    // Написание записки о различии синонимов между собой
    WriteNoticeSynonyms = 3,
    // Обогащение слова синонимами
    EnrichmentSynonyms = 4,
    // Формулировка экзамена
    Examination = 5,
    // Генерация тем, списка используемых слов, грамматических структур для подальшего использования в: массовой генерации наборов слов; написании заметок для различия между синонимами; подбора тематических схем экзамена
    Creative = 6,
    // Модерация используемого контента
    Moderation = 7
}

// Дефолтные настройки, выбранные разработчиком. Могут быть изменены для конкретных целей для конкретных пользователей
const DeveloperSelectedAiTargets = {
    [AiTargets.TranslateWord]: "gpt-4o-mini",
    [AiTargets.GenerateSet]: "gpt-4o",
    [AiTargets.WriteNoticeSynonyms]: "gpt-4o",
    [AiTargets.EnrichmentSynonyms]: "gpt-4o",
    [AiTargets.Examination]: "gpt-5",
    [AiTargets.Creative]: "gpt-4.1",
    [AiTargets.Moderation]: "gpt-3.5-turbo"
}

export {
    AiTargets,
    DeveloperSelectedAiTargets
}