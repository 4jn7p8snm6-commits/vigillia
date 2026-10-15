export type WorldEvent = {
  id: string;
  title: string;
  kind: "wildfires" | "floods";
  date: string;
  latitude: number;
  longitude: number;
  sourceUrl: string | null;
};

export function parseWorldEvents(input: unknown): WorldEvent[] {
  if (!input || typeof input !== "object" || !("events" in input) || !Array.isArray(input.events)) throw new Error("Données indisponibles");
  return input.events.flatMap((event) => {
    if (!event || typeof event.id !== "string" || typeof event.title !== "string") return [];
    const kind = event.categories?.find((c: { id: string }) => c.id === "wildfires" || c.id === "floods")?.id;
    if (!kind) return [];
    const geometry = [...(event.geometry ?? [])].filter((g) => g.type === "Point" && Array.isArray(g.coordinates) && Number.isFinite(g.coordinates[0]) && Number.isFinite(g.coordinates[1]) && Number.isFinite(Date.parse(g.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
    if (!geometry || Math.abs(geometry.coordinates[0]) > 180 || Math.abs(geometry.coordinates[1]) > 90) return [];
    const source = event.sources?.find((s: { url?: string }) => s.url?.startsWith("https://"));
    return [{ id: event.id, title: event.title, kind, date: geometry.date, longitude: geometry.coordinates[0], latitude: geometry.coordinates[1], sourceUrl: source?.url ?? null }];
  }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}