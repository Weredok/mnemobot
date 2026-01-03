import { Telegram } from "puregram";

const client = new Telegram({ token: "8287826634:AAFGorZTK7a56xVm_FXj5Qdc8MOoS1u-JJQ" });
await client.updates.startPolling();

export { client as TelegramClient }