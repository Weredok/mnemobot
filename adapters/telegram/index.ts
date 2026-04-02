import { Telegram } from "puregram";

console.log(process.env.version)
const client = new Telegram({ token: process.env.telegram_adapter_token });

await client.updates.startPolling();

export { client as TelegramClient }