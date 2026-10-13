import { buildPushHTTPRequest } from "@pushforge/builder";
import type { DetectionResult } from "./detection.server";

const DEDUPE_MINUTES = 10;

type Payload = { title: string; body: string; tag: string; url?: string };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function getJwk() {
  const raw = process.env["VAPID_PRIVATE_JWK"];
  if (!raw) throw new Error("Clé de notification manquante côté serveur.");
  return JSON.parse(raw) as JsonWebKey;
}

async function sendOne(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: Payload,
): Promise<"ok" | "gone" | "error"> {
  try {
    const req = await buildPushHTTPRequest({
      privateJWK: getJwk() as never,
      subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      message: {
        payload,
        adminContact: "mailto:alertes@vigillia.lovable.app",
        options: { ttl: 3600, urgency: "high", topic: payload.tag.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, "") },
      },
    });
    const res = await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.error("Push refusé", res.status, await res.text());
      return "error";
    }
    return "ok";
  } catch (e) {
    console.error("Push erreur", e);
    return "error";
  }
}

export async function saveSubscription(s: { endpoint: string; p256dh: string; auth: string; label?: string | undefined }) {
  const db = await admin();
  const { error } = await db
    .from("push_subscriptions")
    .upsert({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, label: s.label ?? null }, { onConflict: "endpoint" });
  if (error) throw new Error("Impossible d'enregistrer l'appareil.");
}

export async function removeSubscription(endpoint: string) {
  const db = await admin();
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** Envoie une notification de TEST uniquement à l'appareil demandeur (doit être enregistré). */
export async function sendTest(endpoint: string) {
  const db = await admin();
  const { data } = await db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("endpoint", endpoint).maybeSingle();
  if (!data) throw new Error("Cet appareil n'est pas enregistré. Réactivez les notifications.");
  const heure = new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" });
  const r = await sendOne(data, {
    title: "🧪 TEST — VigillIA",
    body: `Notification de test (aucun danger réel). Heure : ${heure}`,
    tag: "vigillia-test",
  });
  await db.from("alert_events").insert({ kind: "test", severity: "Test", title: "🧪 TEST — VigillIA", is_test: true, sent_count: r === "ok" ? 1 : 0, failed_count: r === "ok" ? 0 : 1 });
  if (r === "gone") {
    await removeSubscription(endpoint);
    throw new Error("Abonnement expiré. Réactivez les notifications.");
  }
  if (r === "error") throw new Error("Le service de notifications a refusé l'envoi.");
  return { ok: true };
}

/** Appelé côté serveur après une détection réelle de l'IA. */
export async function notifyDetection(result: DetectionResult, location?: string) {
  const events: { kind: string; label: string; conf: number; desc: string }[] = [];
  if (result.incendie.detecte) events.push({ kind: "incendie", label: "Incendie détecté", conf: result.incendie.confiance, desc: result.incendie.description });
  if (result.inondation.detecte) events.push({ kind: "inondation", label: "Risque d'inondation", conf: result.inondation.confiance, desc: result.inondation.description });
  if (!events.length) return;

  const both = events.length === 2;
  const db = await admin();
  const loc = location?.trim().slice(0, 80) || null;
  const since = new Date(Date.now() - DEDUPE_MINUTES * 60_000).toISOString();
  const { data: subs } = await db.from("push_subscriptions").select("endpoint,p256dh,auth");
  if (!subs?.length) return;

  for (const ev of events) {
    const kind = both ? "critique" : ev.kind;
    let q = db.from("alert_events").select("id").eq("kind", kind).gte("created_at", since).limit(1);
    q = loc ? q.eq("location", loc) : q.is("location", null);
    const { data: recent } = await q;
    if (recent?.length) continue; // même événement déjà notifié

    const critical = both || ev.conf >= 0.85;
    const severity = critical ? "CRITIQUE" : ev.conf >= 0.7 ? "Élevée" : "Modérée";
    const heure = new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    const title = both ? "🚨 ALERTE CRITIQUE — Incendie + inondation" : `${ev.kind === "incendie" ? "🔥" : "🌊"} ${ev.label}${critical ? " — CRITIQUE" : ""}`;
    const body = [`Gravité : ${severity} (${Math.round(ev.conf * 100)} %)`, `Heure : ${heure}`, loc ? `Lieu : ${loc}` : null, ev.desc].filter(Boolean).join("\n");

    let sent = 0;
    let failed = 0;
    for (const s of subs) {
      const r = await sendOne(s, { title, body, tag: `vigillia-${kind}`, url: "/" });
      if (r === "ok") sent++;
      else failed++;
      if (r === "gone") await removeSubscription(s.endpoint);
    }
    await db.from("alert_events").insert({ kind, location: loc, severity, title, sent_count: sent, failed_count: failed });
    if (both) break;
  }
}

export async function listHistory() {
  const db = await admin();
  const { data } = await db
    .from("alert_events")
    .select("id,kind,location,severity,title,sent_count,failed_count,is_test,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  return data ?? [];
}
