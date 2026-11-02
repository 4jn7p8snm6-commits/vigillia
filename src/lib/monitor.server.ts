import type { DetectionResult } from "./detection.server";
import type { Coordinates } from "./coordinates";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getSettings() {
  const db = await admin();
  const { data, error } = await db.from("monitor_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("Réglages de surveillance indisponibles.");
  return data;
}

export async function publicSettings() {
  const s = await getSettings();
  return {
    camera_url: s.camera_url ?? "",
    location: s.location ?? "",
    enabled: s.enabled,
    threshold: s.threshold,
    last_run_at: s.last_run_at,
    last_status: s.last_status,
    coordinates: s.latitude !== null && s.longitude !== null ? { latitude: s.latitude, longitude: s.longitude } : null,
    zone_radius_m: s.zone_radius_m,
  };
}

export async function updateSettings(v: { camera_url: string; location: string; enabled: boolean; threshold: number; coordinates?: Coordinates | null; zone_radius_m?: number | undefined }) {
  const db = await admin();
  const previous = await getSettings();
  const cameraChanged = (previous.camera_url ?? "") !== v.camera_url;
  const { error } = await db
    .from("monitor_settings")
    .update({ camera_url: v.camera_url || null, location: v.location || null, enabled: v.enabled, threshold: v.threshold, latitude: v.coordinates?.latitude ?? null, longitude: v.coordinates?.longitude ?? null, ...(v.zone_radius_m !== undefined ? { zone_radius_m: v.zone_radius_m } : {}), ...(cameraChanged ? { camera_ok: null, camera_checked_at: null } : {}), updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error("Impossible d'enregistrer les réglages.");
}

/** Applique le seuil de sensibilité choisi : sous le seuil, pas de détection. */
export function applyThreshold(r: DetectionResult, threshold: number): DetectionResult {
  return {
    ...r,
    incendie: { ...r.incendie, detecte: r.incendie.detecte && r.incendie.confiance >= threshold },
    inondation: { ...r.inondation, detecte: r.inondation.detecte && r.inondation.confiance >= threshold },
  };
}

/** Enregistre la photo + la détection, puis envoie les notifications. */
export async function recordDetection(r: DetectionResult, base64: string, location: string | undefined, source: string, coordinates?: Coordinates) {
  if (!r.incendie.detecte && !r.inondation.detecte) return;
  const db = await admin();
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
  const bytes = Uint8Array.from(atob(base64.replace(/^data:image\/\w+;base64,/, "")), (c) => c.charCodeAt(0));
  const up = await db.storage.from("detections").upload(path, bytes, { contentType: "image/jpeg" });
  const maxConf = Math.max(r.incendie.detecte ? r.incendie.confiance : 0, r.inondation.detecte ? r.inondation.confiance : 0);
  const both = r.incendie.detecte && r.inondation.detecte;
  const severity = both || maxConf >= 0.85 ? "CRITIQUE" : maxConf >= 0.7 ? "Élevée" : "Modérée";
  const saved = await db.from("detections").insert({
    source,
    location: location?.trim().slice(0, 80) || null,
    fire: r.incendie.detecte,
    flood: r.inondation.detecte,
    fire_conf: r.incendie.confiance,
    flood_conf: r.inondation.confiance,
    severity,
    summary: r.resume,
    image_path: up.error ? null : path,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
  });
  if (saved.error) throw new Error("Enregistrement de l’alerte impossible.");
  try {
    const { notifyDetection } = await import("./push.server");
    await notifyDetection(r, location);
  } catch (e) {
    console.error("Envoi des notifications échoué", e);
  }
}

export async function listDetections() {
  const db = await admin();
  const { data } = await db.from("detections").select("*").order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  const paths = rows.map((r) => r.image_path).filter(Boolean) as string[];
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await db.storage.from("detections").createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows.map((r) => ({ ...r, image_url: r.image_path ? urls.get(r.image_path) ?? null : null }));
}

/** Un cycle de surveillance Cloud : capture l'image de la caméra IP et l'analyse. */
export async function runTick(force = false) {
  const s = await getSettings();
  if (!s.camera_url || (!s.enabled && !force)) return { status: "inactive" };
  const db = await admin();
  let status: string;
  let cameraOk = false;
  try {
    const res = await fetch(s.camera_url, { headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Caméra injoignable (code ${res.status})`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) throw new Error("L'adresse ne renvoie pas une image");
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 5_000_000) throw new Error("Image trop lourde (max 5 Mo)");
    cameraOk = true;
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const base64 = btoa(bin);
    const { analyzeFrame } = await import("./detection.server");
    const { recordAIHealth } = await import("./system-health.server");
    let raw;
    try { raw = await analyzeFrame(base64, new Request("https://vigillia.lovable.app")); await recordAIHealth(true); }
    catch (error) { await recordAIHealth(false); throw error; }
    const r = applyThreshold(raw, s.threshold);
    await recordDetection(r, base64, s.location ?? undefined, "cloud", s.latitude !== null && s.longitude !== null ? { latitude: s.latitude, longitude: s.longitude } : undefined);
    status = r.incendie.detecte || r.inondation.detecte ? `Danger détecté : ${r.resume}` : `OK — ${r.resume}`;
  } catch (e) {
    status = `Erreur : ${e instanceof Error ? e.message : "inconnue"}`;
  }
  await db.from("monitor_settings").update({ last_run_at: new Date().toISOString(), last_status: status.slice(0, 300), camera_ok: cameraOk, camera_checked_at: new Date().toISOString() }).eq("id", 1);
  return { status };
}
