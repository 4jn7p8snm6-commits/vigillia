import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import { AI_MODEL_ID } from "./surveillance";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = AI_MODEL_ID;

function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

const detectionSchema = z.object({
  incendie: z.object({
    detecte: z.boolean(),
    confiance: z.number(),
    description: z.string(),
  }),
  inondation: z.object({
    detecte: z.boolean(),
    confiance: z.number(),
    description: z.string(),
  }),
  resume: z.string(),
});

export type DetectionResult = z.infer<typeof detectionSchema>;

const SYSTEM_PROMPT = `Tu es un système de surveillance automatisé spécialisé dans la détection de catastrophes naturelles sur des images de caméras de surveillance.

Analyse chaque image et détecte :
1. INCENDIE : flammes, fumée importante, brasier, départ de feu, lueur incandescente anormale.
2. INONDATION : eau stagnante ou courante envahissant une zone normalement sèche, submersion, crue, refoulement.

Règles :
- Sois prudent : ne signale une détection que si les signes visuels sont réels (confiance >= 0.5). Un ciel orange, un coucher de soleil, une flaque de pluie ou un sol mouillé ne suffisent PAS.
- confiance est un nombre entre 0 et 1.
- description : une phrase courte en français décrivant ce qui est observé (ou "Rien à signaler" si non détecté).
- resume : une phrase en français résumant l'état général de la scène.`;

export async function analyzeFrame(imageDataUrl: string, request: Request): Promise<DetectionResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("Clé Lovable AI manquante côté serveur.");
  }

  const runIdFetch = createRunIdFetch(
    request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined,
  );
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyse cette image de surveillance et détecte tout incendie ou inondation." },
            { type: "file", data: base64, mediaType: "image/jpeg" },
          ],
        },
      ],
      output: Output.object({ schema: detectionSchema }),
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
    const output = await result.output;
    if (!output) throw new Error("Aucun résultat d'analyse.");
    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const match = error.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = detectionSchema.safeParse(JSON.parse(match[0]));
        if (parsed.success) return parsed.data;
      }
    }
    throw error;
  }
}
