import en from "./en.json" with { type: "json" };

export function text(t: string, l: string): string {
  const lg = { en };

  return t.split(".").reduce((acc, curr) => (acc ? acc[curr] : undefined), lg[l]) || (() => { console.log(`[WARNING]: (9001) |${t}| on |${l}| isn't defined`) })() || "Not translated now or it has unexpected problems.";
};