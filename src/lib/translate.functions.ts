import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const translateToSpanish = createServerFn({ method: "POST" })
  .inputValidator(z.object({ texts: z.array(z.string().max(1000)).max(120) }))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey || data.texts.length === 0) return { translations: data.texts };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: "Translate each French UI string of the array into Spanish (Spain). Keep emojis, numbers, punctuation and the names VigilIA/VigillIA/GPT-6 Astra unchanged. Return the same number of strings in the same order.",
        input: JSON.stringify(data.texts),
        text: { format: { type: "json_schema", name: "translations", strict: true, schema: { type: "object", additionalProperties: false, required: ["t"], properties: { t: { type: "array", items: { type: "string" } } } } } },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`translation ${res.status}`);
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try { const e = JSON.parse(l.slice(5)); if (e.type === "response.output_text.delta") out += e.delta; } catch { /* ignore */ }
      }
    }
    const t: unknown = JSON.parse(out || "{}").t;
    if (!Array.isArray(t) || t.length !== data.texts.length) return { translations: data.texts };
    return { translations: t.map((v, i) => (typeof v === "string" ? v : data.texts[i])) };
  });
