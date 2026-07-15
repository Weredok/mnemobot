// import OpenAI from "openai";

// const client = new OpenAI({ apiKey: "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" });

// // ---- типы ----
// type SchemaResult = {
//     terms: string[];
//     translations: string[];
//     synonyms: string[][];
// };

// type Usage = {
//     prompt_tokens?: number;
//     completion_tokens?: number;
//     total_tokens?: number;
// };

// type ProcessResult =
//     | {
//         ok: true;
//         data: SchemaResult;
//         usage: Usage;
//     }
//     | {
//         ok: false;
//         error: string;
//         raw?: string;
//         details?: any;
//         usage?: Usage;
//     };

// // ---- батчинг ----
// export async function processBatch(
//     inputs: string[]
// ): Promise<ProcessResult[]> {
//     const results: ProcessResult[] = [];

//     for (const input of inputs) {
//         try {
//             const response = await client.chat.completions.create({
//                 model: "gpt-4o-mini",
//                 messages: [
//                     { role: "system", content: "Ты переводчик. Верни JSON." },
//                     { role: "user", content: `Разбери слово: ${input}` },
//                 ],
//                 response_format: { type: "json_object" },
//             });

//             const usage: Usage = {
//                 prompt_tokens: response.usage?.prompt_tokens,
//                 completion_tokens: response.usage?.completion_tokens,
//                 total_tokens: response.usage?.total_tokens,
//             };

//             let data: SchemaResult;
//             try {
//                 data = JSON.parse(response.choices[0].message.content ?? "{}");
//             } catch (e) {
//                 results.push({
//                     ok: false,
//                     error: "JSON parse error",
//                     raw: response.choices[0].message.content ?? "",
//                     details: e,
//                     usage,
//                 });
//                 continue;
//             }

//             results.push({ ok: true, data, usage });
//         } catch (e) {
//             results.push({
//                 ok: false,
//                 error: e instanceof Error ? e.message : "Unknown error",
//                 raw: String(e),
//                 details: e,
//             });
//         }
//     }

//     return results;
// }

// // ---- тест ----
// (async () => {
//     const inputs = ["cat", "dog", "apple"];
//     const res = await processBatch(inputs);

//     res.forEach((r, i) => {
//         console.log(`\n=== ${inputs[i]} ===`);
//         if (r.ok) {
//             console.log("✅ OK:", r.data);
//             console.log("Usage:", r.usage);
//         } else {
//             console.error("❌ Error:", r.error);
//             if (r.raw) console.error("Raw:", r.raw.slice(0, 200));
//         }
//     });
// })();
