import "reflect-metadata";  
import { DataSource } from "typeorm";
import { Flashcard } from "./models/Flashcard.ts";
import { Set } from "./models/Set.ts";
import { Session, ResponseInfo } from "./models/Session.ts";
import { User, CEFR } from "./models/User.ts";
import { Folder } from "./models/Folder.ts";
import { Log } from "./models/Log.ts";
import { Preferences } from "./models/Preferences.ts";
import { config } from "dotenv";
import fs from "fs";    
import { Dictionary } from "core";
config({ path: "./../../.env" });

console.log(process.env.url)
const datasource = new DataSource({
    // type: "postgres",
    // url: "postgres://pterodactyl:0NNR7H985JIZBFK2@dono-01.danbot.host:9474/postgres",
    type: "better-sqlite3",
    database: "../../db.sql",
    synchronize: true,
    entities: [Flashcard, Set, Session, User, Folder, Log, Preferences, Dictionary],
});



// User.useDataSource(datasource);
// Set.useDataSource(datasource);
// Flashcard.useDataSource(datasource);
// Session.useDataSource(datasource);
// Folder.useDataSource(datasource);
// Log.useDataSource(datasource);
// Preferences.useDataSource(datasource);
    await datasource.initialize().then((ds) => { console.log(`[${new Date().toLocaleString()}]: База данных ${ds.options.type} успешно подключена`) }).catch((reason) => console.error(`[${new Date().toLocaleString()}]: База данных не была подключена из-за неизвестной ошибки\n${reason}`));

export { datasource }
export { Flashcard, Session, User, Set, Folder, Preferences, CEFR }
export type { AiUsageQuota, AiUsageRecord } from "./models/User.ts";
export type { ResponseInfo }