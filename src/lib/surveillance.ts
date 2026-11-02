import { z } from "zod";

/** Identifiant réel du modèle appelé côté serveur, et son nom affiché à l'utilisateur. */
export const AI_MODEL_ID = "openai/gpt-6-astra";
export const AI_MODEL_LABEL = "GPT-6 Astra";

export const overviewSchema = z.object({
  synced_at: z.string(),
  stats: z.object({ total: z.number(), fires: z.number(), floods: z.number(), false_alerts: z.number(), unreviewed: z.number() }),
  trend: z.array(z.object({ day: z.string(), total: z.number(), fires: z.number(), floods: z.number() })),
  camera: z.object({ configured: z.boolean(), enabled: z.boolean(), latitude: z.number().nullable(), longitude: z.number().nullable(), radius: z.number(), checked_at: z.string().nullable(), ok: z.boolean().nullable(), last_run_at: z.string().nullable() }),
  ai: z.object({ checked_at: z.string().nullable(), ok: z.boolean().nullable() }),
});
export type Overview = z.infer<typeof overviewSchema>;

export function healthState(ok: boolean | null, checkedAt: string | null, now: number): "ok" | "error" | "unknown" | "stale" {
  if (ok === null || !checkedAt || !Number.isFinite(Date.parse(checkedAt))) return "unknown";
  if (now - Date.parse(checkedAt) > 5 * 60 * 1000) return "stale";
  return ok ? "ok" : "error";
}

export function dailyTrend(trend: Overview["trend"], now: string) {
  const end = new Date(now); end.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(end.getTime() - (29 - index) * 86400000).toISOString().slice(0, 10);
    return trend.find((row) => row.day === day) ?? { day, total: 0, fires: 0, floods: 0 };
  });
}