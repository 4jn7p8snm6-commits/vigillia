import { useEffect, useState } from "react";
import { Activity, BrainCircuit, Camera, Server, Wifi } from "lucide-react";
import { AI_MODEL_LABEL, healthState, type Overview } from "@/lib/surveillance";

function Status({ icon: Icon, label, text, good = false }: { icon: typeof Server; label: string; text: string; good?: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"><span className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" />{label}</span><span className={`text-right text-xs ${good ? "text-safe" : "text-muted-foreground"}`}>{text}</span></div>;
}
export function SystemStatus({ overview, error, syncing }: { overview?: Overview | undefined; error: boolean; syncing: boolean }) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); setNow(Date.now()); };
    update(); const timer = setInterval(update, 30000);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { clearInterval(timer); window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const ai = healthState(overview?.ai.ok ?? null, overview?.ai.checked_at ?? null, now);
  const camera = healthState(overview?.camera.ok ?? null, overview?.camera.checked_at ?? null, now);
  const labels = { ok: "Disponible · dernière analyse réussie", error: "Dernière analyse échouée", unknown: "Aucune analyse effectuée pour l'instant", stale: "Dernière vérification ancienne" };
  return <section aria-label="État du système">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Activity className="h-5 w-5 text-safe" />État du système</h2>
    <Status icon={Server} label="Serveur" text={error ? "Synchronisation échouée" : overview ? "Opérationnel · réponse reçue" : "Vérification…"} good={!!overview && !error} />
    <Status icon={BrainCircuit} label={`IA · ${AI_MODEL_LABEL}`} text={labels[ai]} good={ai === "ok"} />
    <Status icon={Wifi} label="Internet" text={online === null ? "Vérification…" : !online ? "Hors connexion" : overview && !error ? "Connexion au serveur confirmée" : "Réseau présent · serveur non confirmé"} good={online === true && !!overview && !error} />
    <Status icon={Camera} label="Caméra Cloud" text={!overview ? "Vérification…" : !overview.camera.configured ? "Aucune caméra configurée" : camera === "ok" ? "1 caméra fonctionnelle" : camera === "error" ? "Caméra injoignable au dernier test" : camera === "stale" ? "1 configurée · test ancien" : "1 configurée · non testée"} good={camera === "ok"} />
    <p className="mt-3 text-xs text-muted-foreground">Dernière synchronisation : {overview ? new Date(overview.synced_at).toLocaleString("fr-FR") : "Aucune"}{syncing && " · Actualisation…"}</p>
  </section>;
}