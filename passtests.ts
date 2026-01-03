import { CEFR, Notification, User } from "database";


const dev = new User();
dev.id = 2
dev.telegramIDs =  [8097145027];
dev.discordIDS = "1276300934141579305";
dev.sessions = [];
dev.sets = [];
dev.wordsTotal = 0;
dev.languages = ["Russian", "English"];
dev.knowing = { "Russian": CEFR.A1 };
dev.aiUsing = [];
dev.aiRestrictions = [];

await dev.save();

console.log(await User.find());
let notifi = new Notification();
notifi.data = {
    userId: 1,
        message: "test",
        buttons: [
            {
                name: "test",
                id: "test"
            }
        ],
        datestamp: Date.now(),
        editAfter: 10000,
        editButtonsAfter: 15000,
        editedMessage: "test test test",
        editedButtons: [
            {
                name: "test2",
                id: "test2"
            }
        ],
        deleteAfter: 30000,
        deleteButtonsAfter: 25000
    };
    notifi.type = 1;
    notifi.active = true;
    notifi = await notifi.save()

await notifi.send();
console.log(notifi);