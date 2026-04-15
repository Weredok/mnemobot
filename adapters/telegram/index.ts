import { MenuHelper, StartMenu } from "commands";
import { User } from "database";
import { Telegram } from "puregram";
import { ArrayContainedBy, ArrayContains } from "typeorm";

console.log(process.env.version);
const client = new Telegram({ token: process.env.telegram_adapter_token });

client.updates.on("message", async (ctx) => {
  switch (ctx.text) {
    case "/start":
      const user = await User.findOneBy({
        telegramIDs: ArrayContainedBy([String(ctx.from.id)]),
      });
      if (!user) {
        console.error(
          `[database] (Telegram): User with id ${ctx.from.id} not found. Request aborted.`,
        );
        return;
      }
      const mh = new MenuHelper(
        user,
        {
          userId: user.id,
          discordUserId: undefined,
          telegramUserId: user.telegramIDs[0],
        },
        "telegram",
      );
      const startmenu = new StartMenu(mh);

      await startmenu.initialize();
      const { content, replyMarkup, parse_mode } = await startmenu.build();

      await ctx.reply(content, {
        reply_markup: replyMarkup,
        parse_mode: parse_mode,
      });

      break;
  }
});

client.updates.startPolling();

export { client as TelegramClient };
