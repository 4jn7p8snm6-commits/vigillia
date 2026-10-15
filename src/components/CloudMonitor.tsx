import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cloud, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { getMonitorSettings, runMonitorNow, saveMonitorSettings } from "@/lib/monitor.functions";

type S = Awaited<ReturnType<typeof getMonitorSettings>>;

export function CloudMonitor() {
  const fetchSettings = useServerFn(getMonitorSettings);
  const persistSettings = useServerFn(saveMonitorSettings);
  const runMonitor = useServerFn(runMonitorNow);
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setS(await fetchSettings());
  useEffect(() => { void load().catch(() => setMsg("Réglages indisponibles.")); }, []);

  if (!s) return <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">{msg ?? "Chargement…"}</div>;

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await persistSettings({ data: { camera_url: s.camera_url.trim(), location: s.location, enabled: s.enabled && !!s.camera_url.trim(), threshold: s.threshold } });
      setMsg("Réglages enregistrés.");
      await load();
    } catch { setMsg("Adresse invalide (doit commencer par http:// ou https://)."); }
    setBusy(false);
  };
  const test = async () => {
    setBusy(true); setMsg("Analyse en cours…");
    try { const r = await runMonitor(); setMsg(r.status === "inactive" ? "Ajoutez d'abord l'adresse de la caméra." : r.status); await load(); }
    catch { setMsg("Échec de l'analyse."); }
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Surveillance Cloud 24/7</h2>
      </div>
      <p className="text-xs text-muted-foreground">Le serveur analyse la caméra toutes les 2 minutes, même iPad éteint, et envoie les notifications.</p>
      {!s.camera_url && <p className="text-xs text-warning">Prête à configurer · aucune caméra connectée, aucune surveillance en cours.</p>}
      <label className="block text-xs">Adresse de l'image de la caméra (accessible depuis internet)
        <input value={s.camera_url} onChange={(e) => setS({ ...s, camera_url: e.target.value })} placeholder="https://…/snapshot.jpg" maxLength={500}
          className="mt-1 w-full rounded-md border border-border bg-secondary px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-xs">Lieu
        <input value={s.location} onChange={(e) => setS({ ...s, location: e.target.value })} placeholder="Ex. Garage" maxLength={80}
          className="mt-1 w-full rounded-md border border-border bg-secondary px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-xs">Sensibilité : alerte à partir de {Math.round(s.threshold * 100)} % de confiance
        <input type="range" min={0.3} max={0.95} step={0.05} value={s.threshold} onChange={(e) => setS({ ...s, threshold: Number(e.target.value) })} className="mt-1 w-full" />
        <span className="flex justify-between text-[10px] text-muted-foreground"><span>Plus vigilant</span><span>Moins de fausses alertes</span></span>
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
        Surveillance Cloud activée
      </label>
      <div className="flex gap-2">
        <Button onClick={() => void save()} disabled={busy} size="sm"><Save />Enregistrer</Button>
        <Button onClick={() => void test()} disabled={busy || !s.camera_url} size="sm" variant="outline"><Play />Analyser maintenant</Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      {s.last_run_at && <p className="text-[11px] text-muted-foreground">Dernier passage : {new Date(s.last_run_at).toLocaleString("fr-FR")} — {s.last_status}</p>}
      <Link to="/alertes" className="block text-xs font-medium text-primary underline">Voir toutes les alertes avec photos →</Link>
    </div>
  );
}
