import { MenuHelper, StartMenu } from "commands";
import { Location } from "commands/classes/StartMenu.ts";
import { User } from "database";
import { Telegram } from "puregram";
import { ArrayContainedBy, ArrayContains } from "typeorm";

const client = new Telegram({ token: process.env.telegram_adapter_token });

client.updates.on("message", async (ctx) => {
  const commands = ["/setusername", "/setpassword"];

  if (commands.includes(ctx.text.split(" ")[0])) {
    switch (ctx.text.split(" ")[0]) {
      case commands[0]:
        if(ctx.text.split(" ").length > 1){
          await ctx.reply(`not impltemented yet`);
        }
        break;

      case commands[1]:
        await ctx.reply(`not impltemented yet`);
        break;

      default:
        break;
    }
  };

  const user = await User.findOneBy({
    telegramIDs: ArrayContains([String(ctx.from.id)]),
  });

  if (!user) {
    console.error(
      `[database] (Telegram): User with id ${ctx.from.id} not found. Request aborted.`,
    );
    return;
  };

  const mh = new MenuHelper(
    user,
    {
      userId: user.id,
      discordUserId: undefined,
      telegramUserId: Number(user.telegramIDs[0]),
    },
    "telegram",
  );
  const startmenu = new StartMenu(mh);

  await startmenu.initialize();

  let { content, replyMarkup, parse_mode } = await startmenu.locate(
    ctx.text === "/start" ? Location.Home : (ctx.text as Location),
  );

  await ctx.reply(content, {
    // @ts-ignore
    reply_markup: replyMarkup,
    parse_mode: parse_mode,
  });
});

client.updates.on("callback_query", async (ctx) => {
  const user = await User.findOneBy({
    telegramIDs: ArrayContains([String(ctx.from.id)]),
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
      telegramUserId: Number(user.telegramIDs[0]),
    },
    "telegram",
  );
  const startmenu = new StartMenu(mh);

  await startmenu.initialize();

  let { content, replyMarkup, parse_mode } = await startmenu.locate(
    ctx.data as Location,
  );

  await ctx.answer({
    text: "Действие выполнено!", // Покажет toast-уведомление (сверху экрана)
    show_alert: false, // Если true — покажет модальное окно с кнопкой "OK"

  });

  if (content || replyMarkup || parse_mode) {
    await ctx.message.editText(content || "no-content", {
      // @ts-ignore
      reply_markup: replyMarkup || {},
      parse_mode: parse_mode || "HTML",
    });
  } else {
    await ctx.message.editText(
      `[WARNING]: (9002)**__${ctx.data}__** not implemented yet :)`,
    );
  }
});

client.updates.startPolling(); 

export { client as TelegramClient };
