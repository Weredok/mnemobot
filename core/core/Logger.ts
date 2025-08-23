// logger.ts
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, errors, json } = format;

const baseFormat = combine(
  timestamp(),
  errors({ stack: true }), // stack в error объектах
  json()                    // структурированный JSON
);

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  defaultMeta: { service: 'entry-service' },
  format: baseFormat,
  transports: [
    // Лог файл для всех info+ (ротация по дате)
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '14d',      // хранить 14 дней
      level: 'info'
    }),
    // Отдельный файл только для ошибок
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    })
  ],
  exitOnError: false,
});

// В dev удобно также выводить в консоль, но формат простой
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(format.colorize(), format.simple()),
    level: 'debug'
  }));
}

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createGunzip } from 'zlib';

/**
 * Асинхронный генератор — ищет строки логов (NDJSON) по interactionId в каталоге логов.
 * Возвращает объекты { file, lineNumber, log }.
 *
 * usage:
 * for await (const hit of findLogsByInteractionId('my-id')) { console.log(hit); }
 */
export async function* findLogsByInteractionId(
  interactionId: string,
  options?: {
    logsDir?: string;               // каталог с логами
    exts?: string[];                // расширения файлов для поиска (по умолчанию .log и .log.gz)
    limit?: number;                 // максимум возвращаемых записей (undefined = без лимита)
    matchFields?: string[];         // поля JSON, в которых искать id (по умолчанию ['interactionId','correlationId','traceId'])
  }
): AsyncGenerator<{ file: string; lineNumber: number; log: any }, void, unknown> {
  const logsDir = options?.logsDir ?? path.resolve(process.cwd(), 'logs');
  const exts = options?.exts ?? ['.log', '.log.gz'];
  const limit = options?.limit;
  const matchFields = options?.matchFields ?? ['interactionId', 'correlationId', 'traceId'];

  let found = 0;

  const files = await fs.promises.readdir(logsDir).catch(() => []);
  // сортируем по имени (можно изменить, чтобы newest first)
  files.sort();

  for (const fname of files) {
    if (limit !== undefined && found >= limit) return;
    const full = path.join(logsDir, fname);
    const stat = await fs.promises.stat(full).catch(() => null);
    if (!stat || !stat.isFile()) continue;

    const ext = exts.find(e => fname.endsWith(e));
    if (!ext) continue;

    // создаём поток: поддержка .gz и обычных файлов
    let stream: fs.ReadStream | NodeJS.ReadableStream;
    if (fname.endsWith('.gz')) {
      stream = fs.createReadStream(full).pipe(createGunzip());
    } else {
      stream = fs.createReadStream(full, { encoding: 'utf8' });
    }

    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber++;
      if (!line || !line.trim()) continue;

      // быстрый фильтр по вхождению id в строку (экономит парсинг)
      if (!line.includes(interactionId)) continue;

      try {
        const obj = JSON.parse(line);
        // ищем по набору полей
        const matched = matchFields.some(f => {
          const v = obj[f];
          return v === interactionId || (typeof v === 'string' && v.includes(interactionId));
        });
        if (matched) {
          yield { file: full, lineNumber, log: obj };
          found++;
          if (limit !== undefined && found >= limit) {
            rl.close();
            break;
          }
        }
      } catch {
        // невалидный JSON — пропускаем
        continue;
      }
    }
    // попытка корректно закрыть интерфейс/стрим
    rl.close();
    if (limit !== undefined && found >= limit) return;
  }
}


export { logger}