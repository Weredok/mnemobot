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
import { Notification, NotificationType } from "./models/Notification.ts";
import { Spawn } from "./models/Spawn.ts";
config({ path: "./../../.env" });

const datasource = new DataSource({
    type: "postgres",
    url: "postgres://pterodactyl:0NNR7H985JIZBFK2@dono-01.danbot.host:9474/postgres",
    // type: "better-sqlite3",
    // database: "db.sql",
    dropSchema: true,
    synchronize: true,
    entities: [Flashcard, Set, Session, User, Folder, Log, Preferences, Dictionary, Notification, Spawn],
});


await datasource.initialize().then((ds) => { console.log(`[${new Date().toLocaleString()}]: База данных ${ds.options.type} успешно подключена`) })
export { datasource }
export { Flashcard, Session, User, Set, Folder, Preferences, CEFR , Notification, NotificationType,Spawn }
export type { AiUsageQuota, AiUsageRecord } from "./models/User.ts";
export type { ResponseInfo }