import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Flame, Globe, Loader2, RefreshCw, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { worldEventsQuery } from "@/lib/world-events.functions";
import type { WorldEvent } from "@/lib/world-events";

const WorldMap = lazy(() => import("@/components/WorldMap.client"));

export const Route = createFileRoute("/carte")({
  head: () => ({ meta: [
    { title: "Carte mondiale des événements — VigillIA" },
    { name: "description", content: "Incendies et inondations suivis par NASA EONET, avec lieux, dates d’observation et sources." },
    { property: "og:title", content: "Carte mondiale — VigillIA" },
    { property: "og:description", content: "Explorez les incendies et inondations signalés par NASA EONET." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(worldEventsQuery),
  component: WorldPage,
});

function WorldPage() {
  const { data, refetch, isFetching } = useSuspenseQuery(worldEventsQuery);
  const [filter, setFilter] = useState<"all" | "wildfires" | "floods">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WorldEvent | null>(null);
  const events = data.events.filter((e) => (filter === "all" || e.kind === filter) && e.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const loading = <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement de la carte…</div>;
  return <main className="mx-auto max-w-6xl px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
    <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft />VigillIA</Link></Button>
    <div className="my-5 flex items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><Globe className="text-primary" />Carte mondiale</h1><p className="mt-1 text-sm text-muted-foreground">Événements suivis · NASA EONET · 30 derniers jours · Vue centrée sur Grande Canarie (Espagne)</p></div><Button variant="outline" size="icon" title="Actualiser les événements" aria-label="Actualiser les événements" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button></div>
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Type d’événement">
      <Button size="sm" variant={filter === "all" ? "default" : "outline"} aria-pressed={filter === "all"} onClick={() => { setFilter("all"); setSelected(null); }}>Tous ({data.events.length})</Button>
      <Button size="sm" variant={filter === "wildfires" ? "default" : "outline"} aria-pressed={filter === "wildfires"} onClick={() => { setFilter("wildfires"); setSelected(null); }}><Flame className="text-danger" />Incendies ({data.events.filter((e) => e.kind === "wildfires").length})</Button>
      <Button size="sm" variant={filter === "floods" ? "default" : "outline"} aria-pressed={filter === "floods"} onClick={() => { setFilter("floods"); setSelected(null); }}><Waves />Inondations ({data.events.filter((e) => e.kind === "floods").length})</Button>
      <input aria-label="Rechercher un lieu" placeholder="Rechercher un lieu…" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
    </div>
    {data.error && <p role="alert" className="mb-4 text-sm text-warning">{data.error}</p>}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative isolate h-[420px] overflow-hidden rounded-lg border border-border bg-secondary sm:h-[520px]"><ClientOnly fallback={loading}><Suspense fallback={loading}><WorldMap events={events} selected={selected} onSelect={setSelected} /></Suspense></ClientOnly></div>
      <section className="max-h-[520px] overflow-auto" aria-label="Événements signalés"><h2 className="mb-3 text-sm font-semibold">{events.length} événements géolocalisés</h2>{events.length === 0 && !data.error && <p className="text-sm text-muted-foreground">Aucun événement signalé pour cette sélection. Cela ne signifie pas qu’il n’y a aucun danger.</p>}
        {events.map((e) => <article key={e.id} className={`mb-2 rounded-md border p-3 ${selected?.id === e.id ? "border-primary bg-secondary" : "border-border"}`}><Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left" onClick={() => setSelected(e)}>{e.kind === "wildfires" ? <Flame className="shrink-0 text-danger" /> : <Waves className="shrink-0 text-primary" />}<span className="break-words">{e.title}</span></Button><p className="mt-2 text-xs text-muted-foreground">Observation : {new Date(e.date).toLocaleString("fr-FR")}</p><p className="mt-1 text-xs text-muted-foreground">{e.latitude.toFixed(2)}°, {e.longitude.toFixed(2)}° · Suivi ouvert</p>{e.sourceUrl && <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline" href={e.sourceUrl} target="_blank" rel="noopener noreferrer">Source officielle<ExternalLink className="h-3 w-3" /></a>}</article>)}
      </section>
    </div>
    <p className="mt-4 text-xs text-muted-foreground">{data.fetchedAt && `Données récupérées le ${new Date(data.fetchedAt).toLocaleString("fr-FR")}. `}Source : <a href="https://eonet.gsfc.nasa.gov" target="_blank" rel="noopener noreferrer" className="underline">NASA EONET</a>. Données partielles, parfois retardées ; « suivi ouvert » ne confirme pas un danger actif. Points disponibles uniquement, pas toutes les zones inondées. Aucune gravité n’est déduite de ces données. En cas d’urgence, consultez les autorités locales.</p>
  </main>;
}