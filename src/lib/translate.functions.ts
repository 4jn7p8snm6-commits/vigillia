import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const translateToSpanish = createServerFn({ method: "POST" })
  .inputValidator(z.object({ texts: z.array(z.string().max(1000)).max(120) }))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey || data.texts.length === 0) return { translations: data.texts };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Translate each French UI string of the JSON array into Spanish (Spain). Keep emojis, numbers, punctuation, the brand names VigilIA/VigillIA/GPT-6 Astra unchanged. Reply ONLY with a JSON object {\"t\": [...]} with the same length and order." },
          { role: "user", content: JSON.stringify(data.texts) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`translation ${res.status}`);
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    const t: unknown = parsed.t;
    if (!Array.isArray(t) || t.length !== data.texts.length) return { translations: data.texts };
    return { translations: t.map((v, i) => (typeof v === "string" ? v : data.texts[i])) };
  });
