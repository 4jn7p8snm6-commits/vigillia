import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import type { CrushInput } from "./crush.functions";

const RUN_HEADER = "X-Lovable-AIG-Run-ID";

const schema = z.object({
  scoreInteret: z.number(),
  verdict: z.string(),
  messagesMoi: z.number(),
  messagesCrush: z.number(),
  initiativesMoi: z.number(),
  initiativesCrush: z.number(),
  delaiReponse: z.string(),
  signauxPositifs: z.array(z.string()),
  signauxNegatifs: z.array(z.string()),
  conseils: z.array(z.string()),
  prochainMessage: z.string(),
});
export type CrushResult = z.infer<typeof schema>;

const SYSTEM = `Tu es un coach relationnel bienveillant, drôle et honnête, expert en analyse de conversations WhatsApp.
On te donne un questionnaire sur l'utilisateur, puis une conversation (captures d'écran, images extraites d'un enregistrement d'écran, et/ou export texte).
Sur les captures WhatsApp : les bulles à DROITE (souvent vertes) sont celles de l'utilisateur ("moi"), à GAUCHE celles du crush.
Tâches :
- Compte les messages de chaque côté (utilise les statistiques exactes fournies si présentes, sinon estime à partir de ce qui est visible).
- Compte qui relance / initie les conversations.
- Évalue le délai de réponse si les heures sont visibles.
- Donne un scoreInteret de 0 à 100 sur l'intérêt du CRUSH pour l'utilisateur, en tenant compte du genre et de la situation.
- verdict : une phrase punchy en français.
- signauxPositifs / signauxNegatifs : 2 à 5 éléments concrets cités de la conversation.
- conseils : 3 conseils concrets et respectueux.
- prochainMessage : un exemple de message à envoyer.
Reste respectueux, n'encourage jamais l'insistance ou la manipulation. Réponds en français, ton naturel et jeune.`;

export async function analyzeCrush(input: CrushInput, request: Request): Promise<CrushResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA manquante côté serveur.");

  let runId = request.headers.get(RUN_HEADER)?.trim() || undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (i, init) => {
      const h = new Headers(init?.headers);
      if (runId && !h.has(RUN_HEADER)) h.set(RUN_HEADER, runId);
      const r = await fetch(i, { ...init, headers: h });
      runId ??= r.headers.get(RUN_HEADER)?.trim() || undefined;
      return r;
    },
  });

  const p = input.profile;
  const intro = `Questionnaire :
- Je suis : ${p.userGender}
- Mon crush est : ${p.crushGender}
- Situation : ${p.situation}
- On se parle depuis : ${p.duration}
- Contexte : ${p.context || "aucun"}
${input.stats ? `\nStatistiques exactes calculées depuis le fichier :\n${input.stats}` : ""}
${input.text ? `\nConversation (export texte) :\n${input.text}` : ""}`;

  const content: Array<
    { type: "text"; text: string } | { type: "file"; data: string; mediaType: string }
  > = [{ type: "text", text: intro }];
  for (const img of input.images) {
    content.push({
      type: "file",
      data: img.replace(/^data:image\/\w+;base64,/, ""),
      mediaType: "image/jpeg",
    });
  }

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output: Output.object({ schema }),
      abortSignal: request.signal,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const out = await result.output;
    if (!out) throw new Error("Aucun résultat.");
    return out;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const m = error.text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = schema.safeParse(JSON.parse(m[0]));
        if (parsed.success) return parsed.data;
      }
    }
    throw error;
  }
}
