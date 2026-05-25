import "reflect-metadata";  
import { DataSource } from "typeorm";
import { Flashcard } from "./models/Flashcard.ts";
import { Set } from "./models/Set.ts";
import { Session, ResponseInfo } from "./models/Session.ts";
import { User, CEFR } from "./models/User.ts";
import { Folder } from "./models/Folder.ts";
import { Log } from "./models/Log.ts";
import { Preferences } from "./models/Preferences.ts";
import fs from "fs";    
import { Dictionary } from "core";
import { Notification, NotificationType } from "./models/Notification.ts";
import { Spawn } from "./models/Spawn.ts";

const datasource = new DataSource({
    type: "postgres",
    url: process.env.database_url,
    // type: "better-sqlite3",
    // database: "db.sql",
    name: process.env.database_name,
    dropSchema: true,
    synchronize: process.env.stage === "dev",
    entities: [Flashcard, Set, Session, User, Folder, Log, Preferences, Dictionary, Notification, Spawn],
});


await datasource.initialize()
export { datasource }
export { Flashcard, Session, User, Set, Folder, Preferences, CEFR , Notification, NotificationType,Spawn }
export type { AiUsageQuota, AiUsageRecord } from "./models/User.ts";
export type { ResponseInfo }