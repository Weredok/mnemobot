
enum GeneratorBasePropertiesDataStatus {
    Waiting = "Заявка создана и ожидает рассмотрения модерации",
    Moderated = "Заявка была отклонена модерацией",

    Requested = "Заявка обработана, запрос на генерацию создан",
    Failed = "Запрос на генерацию не был выполнен из-за неизвестной ошибки",
    NotFound = "Запрос на генерацию не был выполнен из-за отстутствия ответа со стороны сервера",
    OnQueue = "Запрос на генерацию находится в очереди на обработку",

    Responsed = "Запрос на генерацию обработан, ожидается обработка данных",
    Generated = "Данные успешно обработаны и готовы к применению",
    FailedToGenerate = "Данные не были обработаны из-за неизвестной ошибки",
    
    Hidden = "Данные были обработаны, но результат обработки был скрыт модерацией проекта",
    Rejected = "Данные были обработаны, но результат обработки был отклонен модерацией проекта",
    RejectedByUser = "Данные были обработаны, но результат обработки был отклонен пользователем",
}

interface GeneratorBaseProperties {
    source: string;
    target: string;
    supportedLanguages: string[];
    user: string;
    definition: string;
    verification: boolean;
    data: {
        request?: string;
        response?: string;
        status?: GeneratorBasePropertiesDataStatus;
        error_message?: string;
        error_code?: number;
    }
}

export class GeneratorBase {

    constructor(public properties: GeneratorBaseProperties, public config: { [key: string]: any }) {
        this.properties = properties;
        this.config = config;
    };

}

export {type GeneratorBaseProperties}
export { GeneratorBasePropertiesDataStatus,  }