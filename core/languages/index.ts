import en from "./en.json" with { type: "json" };
import ru from "./ru.json" with { type: "json" };
import { errorCodes } from "./errors.ts";

export function text(t: string, l: string): string {
  const lg = { en, ru };

  switch (l) {
    case "English":
      l = "en";
      break;
    case "Russian":
    case "ru":
      l = "ru";
      break;
    default:
      l = "en";
  }

  return (
    t.split(".").reduce((acc, curr) => (acc ? acc[curr] : undefined), lg[l]) ||
    (() => {
      console.log(`[WARNING]: (9001) |${t}| on |${l}| isn't defined`);
    })() ||
    errorCodes[9001]
  );
}
