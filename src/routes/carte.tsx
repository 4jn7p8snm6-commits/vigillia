import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, Flame, Loader2, MapPin, RefreshCw, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { surveillanceQuery } from "@/lib/surveillance.functions";
import { SurveillanceStats } from "@/components/SurveillanceStats";
import { SystemStatus } from "@/components/SystemStatus";
import type { WorldEvent } from "@/lib/world-events";

const SurveillanceMap = lazy(() => import("@/components/WorldMap.client"));
export const Route = createFileRoute("/carte")({
  head: () => ({ meta: [
    { title: "Carte de surveillance — VigillIA" },
    { name: "description", content: "Zones surveillées, caméras configurées et incidents localisés VigillIA autour de Grande Canarie, statistiques et état du système." },
    { property: "og:title", content: "Carte de surveillance — VigillIA" },
    { property: "og:description", content: "Suivez les incidents incendie et inondation, les zones surveillées et l’état réel de VigillIA." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(surveillanceQuery),
  component: SurveillancePage,
});
function SurveillancePage() {
  const { data, refetch, isFetching, isError } = useSuspenseQuery(surveillanceQuery);
  const [filter, setFilter] = useState<"all" | "wildfires" | "floods">("all");
  const [selected, setSelected] = useState<WorldEvent | null>(null);
  const events = data.events.filter((event) => filter === "all" || event.kind === filter);
  const camera = data.overview.camera;
  const cameras = camera.configured && camera.latitude !== null && camera.longitude !== null ? [{ latitude: camera.latitude, longitude: camera.longitude, radius: camera.radius, enabled: camera.enabled }] : [];
  const loading = <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement de la carte…</div>;
  return <main className="mx-auto max-w-6xl px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
    <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft />VigillIA</Link></Button>
    <div className="my-5 flex items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><MapPin className="shrink-0 text-primary" />Carte de surveillance</h1><p className="mt-1 text-sm text-muted-foreground">Grande Canarie · Incidents localisés des 30 derniers jours</p></div><Button variant="outline" size="icon" title="Actualiser la surveillance" aria-label="Actualiser la surveillance" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button></div>
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Type d’incident">
      <Button size="sm" variant={filter === "all" ? "default" : "outline"} aria-pressed={filter === "all"} onClick={() => { setFilter("all"); setSelected(null); }}>Tous ({data.events.length})</Button>
      <Button size="sm" variant={filter === "wildfires" ? "default" : "outline"} aria-pressed={filter === "wildfires"} onClick={() => { setFilter("wildfires"); setSelected(null); }}><Flame />Incendies ({data.events.filter((e) => e.kind === "wildfires").length})</Button>
      <Button size="sm" variant={filter === "floods" ? "default" : "outline"} aria-pressed={filter === "floods"} onClick={() => { setFilter("floods"); setSelected(null); }}><Waves />Inondations ({data.events.filter((e) => e.kind === "floods").length})</Button>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div><div className="relative isolate h-[420px] overflow-hidden rounded-lg border border-border bg-secondary sm:h-[520px]"><ClientOnly fallback={loading}><Suspense fallback={loading}><SurveillanceMap events={events} cameras={cameras} selected={selected} onSelect={setSelected} /></Suspense></ClientOnly></div><p className="mt-2 text-xs text-muted-foreground">Positions approximatives · Zones déclarées, pas une couverture visuelle garantie · Détections IA non confirmées par les autorités.</p></div>
      <section className="space-y-5" aria-label="Zones et caméras">
        <div><h2 className="mb-2 flex items-center gap-2 font-semibold"><Camera className="h-4 w-4 text-safe" />Caméras connectées</h2><p className="text-sm text-muted-foreground">{camera.configured ? "1 caméra Cloud configurée" : "Aucune caméra Cloud configurée"}</p>{camera.configured && <p className="mt-1 text-xs text-muted-foreground">{camera.enabled ? "Surveillance activée" : "Surveillance désactivée"} · {cameras.length ? "Position renseignée" : "Position manquante"}</p>}</div>
        <div><h2 className="mb-2 font-semibold">Zones surveillées</h2><p className="text-sm text-muted-foreground">{cameras.length ? `Zone Cloud · rayon déclaré ${camera.radius} m` : "Aucune zone géolocalisée"}</p></div>
        <div className="max-h-64 overflow-y-auto"><h2 className="mb-3 font-semibold">Incidents localisés ({events.length})</h2>{events.length === 0 && <p className="text-sm text-muted-foreground">Aucun incident localisé pour cette sélection.</p>}{events.map((event) => <article key={event.id} className="mb-2 rounded-md border border-border p-3"><Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left" onClick={() => setSelected(event)}>{event.kind === "wildfires" ? <Flame className="shrink-0 text-danger" /> : <Waves className="shrink-0 text-primary" />}{event.title}</Button><p className="mt-2 text-xs text-muted-foreground">{new Date(event.date).toLocaleString("fr-FR")} · {event.latitude.toFixed(2)}°, {event.longitude.toFixed(2)}°</p></article>)}</div>
        <Button size="sm" variant="outline" asChild><Link to="/alertes">Journal des alertes</Link></Button>
      </section>
    </div>
    <div className="mt-8 grid gap-8 border-t border-border pt-6 lg:grid-cols-[minmax(0,1fr)_300px]"><SurveillanceStats overview={data.overview} /><SystemStatus overview={data.overview} error={isError} syncing={isFetching} /></div>
  </main>;
}
