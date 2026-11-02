import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseDetectionMapEvents } from "./world-events";
import { overviewSchema } from "./surveillance";

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Carte des détections indisponible");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}
export async function readDetectionMapEvents() {
  const db = publicClient();
  const { data, error } = await db.from("detection_map_events").select("id, kind, observed_at, latitude, longitude").gte("observed_at", new Date(Date.now() - 30 * 86400000).toISOString()).order("observed_at", { ascending: false }).limit(1000);
  if (error) throw new Error("Carte des détections indisponible");
  return parseDetectionMapEvents(data ?? []);
}

export async function readSurveillance() {
  const db = publicClient();
  const [overview, events] = await Promise.all([db.rpc("surveillance_overview"), readDetectionMapEvents()]);
  if (overview.error) throw new Error("Surveillance indisponible");
  return { overview: overviewSchema.parse(overview.data), events };
}