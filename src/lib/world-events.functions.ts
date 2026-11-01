import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { parseWorldEvents } from "./world-events";

export const getWorldEvents = createServerFn({ method: "GET" }).handler(async () => {
  const { readDetectionMapEvents } = await import("./detection-map.server");
  const nasa = async (category: "wildfires" | "floods") => {
    const response = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?category=${category}&status=open&days=30&limit=500`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Source indisponible");
    return parseWorldEvents(await response.json());
  };
  const results = await Promise.allSettled([nasa("wildfires"), nasa("floods"), readDetectionMapEvents()]);
  const events = [...new Map(results.flatMap((r) => r.status === "fulfilled" ? r.value : []).map((e) => [e.id, e])).values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const errors = results.flatMap((r, i) => r.status === "rejected" ? [i === 2 ? "Les détections VigillIA sont momentanément indisponibles." : `Les données NASA ${i === 0 ? "incendies" : "inondations"} sont momentanément indisponibles.`] : []);
  return { events, fetchedAt: new Date().toISOString(), error: errors.length ? errors.join(" ") : null };
});

export const worldEventsQuery = queryOptions({ queryKey: ["world-events"], queryFn: () => getWorldEvents(), staleTime: 30 * 1000, refetchInterval: 60 * 1000 });