import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getDetections, reviewDetectionFn } from "@/lib/monitor.functions";
import { reliability } from "@/lib/reliability";

export const Route = createFileRoute("/alertes")({
  head: () => ({
    meta: [
      { title: "Journal des alertes — VigillIA" },
      { name: "description", content: "Toutes les détections d'incendie et d'inondation de VigillIA, avec photo, heure et lieu." },
      { property: "og:title", content: "Journal des alertes — VigillIA" },
      { property: "og:description", content: "Détections d'incendie et d'inondation avec photo, heure et lieu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
});

type Row = Awaited<ReturnType<typeof getDetections>>[number];

function AlertsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const load = () => { setErr(false); getDetections().then(setRows).catch(() => setErr(true)); };
  useEffect(load, []);
  const review = async (id: string, v: boolean | null) => {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, false_alert: v } : r)) ?? null);
    try { await reviewDetectionFn({ data: { id, false_alert: v } }); } catch { load(); }
  };
  const rel = rows ? reliability(rows) : null;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Retour</Link>
        <button onClick={load} aria-label="Actualiser" className="text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <h1 className="text-2xl font-bold">Journal des alertes</h1>
      <p className="mb-4 text-sm text-muted-foreground">Indiquez pour chaque alerte si elle était vraie ou fausse : cela mesure la fiabilité réelle de VigilIA. Chaque incendie ou inondation détecté, avec la photo qui l'a déclenché (100 dernières).</p>
      {rel && rel.total > 0 && (
        <section className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-center text-xs sm:grid-cols-4">
          <div><p className="text-lg font-bold">{rel.reviewed}/{rel.total}</p><p className="text-muted-foreground">alertes vérifiées</p></div>
          <div><p className="text-lg font-bold text-success">{rel.confirmed}</p><p className="text-muted-foreground">vraies alertes</p></div>
          <div><p className="text-lg font-bold text-danger">{rel.falses}</p><p className="text-muted-foreground">fausses alertes</p></div>
          <div><p className="text-lg font-bold">{rel.precision === null ? "—" : `${Math.round(rel.precision * 100)} %`}</p><p className="text-muted-foreground">fiabilité mesurée</p></div>
        </section>
      )}
      {err && <p className="text-sm text-danger">Journal indisponible pour le moment.</p>}
      {rows?.length === 0 && <p className="text-sm text-muted-foreground">Aucune détection pour l'instant.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows?.map((r) => (
          <article key={r.id} className="overflow-hidden rounded-xl border border-border bg-card">
            {r.image_url ? <img src={r.image_url} alt={r.summary ?? "Photo de l'alerte"} className="aspect-video w-full object-cover" loading="lazy" />
              : <div className="flex aspect-video items-center justify-center bg-secondary text-xs text-muted-foreground">Pas de photo</div>}
            <div className="space-y-1 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{r.fire && r.flood ? "🚨 Incendie + inondation" : r.fire ? "🔥 Incendie" : "🌊 Inondation"}</span>
                <span className={r.severity === "CRITIQUE" ? "text-danger font-bold" : "text-warning"}>{r.severity}</span>
              </div>
              <p className="text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")} · {r.location ?? "Lieu non précisé"} · {r.source === "cloud" ? "Serveur Cloud" : "Appareil"}</p>
              <p className="text-muted-foreground">Confiance : {r.fire ? `feu ${Math.round(r.fire_conf * 100)} %` : ""}{r.fire && r.flood ? " · " : ""}{r.flood ? `eau ${Math.round(r.flood_conf * 100)} %` : ""}</p>
              {r.summary && <p>{r.summary}</p>}
              <div className="flex flex-wrap items-center gap-1 pt-2">
                <span className="text-muted-foreground">Vérification :</span>
                <button onClick={() => void review(r.id, false)} className={`rounded-md border px-2 py-1 ${r.false_alert === false ? "border-success bg-success/15 text-success" : "border-border"}`}>✅ Vraie</button>
                <button onClick={() => void review(r.id, true)} className={`rounded-md border px-2 py-1 ${r.false_alert === true ? "border-danger bg-danger/15 text-danger" : "border-border"}`}>❌ Fausse</button>
                {r.false_alert !== null && <button onClick={() => void review(r.id, null)} className="px-1 text-muted-foreground underline">annuler</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
