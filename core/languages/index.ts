import en from "./en.json" with { type: "json" };

export function text(t: string, l: string) {
  const lg = { en };
  
  return t.split(".").reduce((acc, curr) => (acc ? acc[curr] : undefined), lg[l]);
}