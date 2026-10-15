import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { parseWorldEvents } from "./world-events";

export const getWorldEvents = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const response = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires,floods&status=open&days=30&limit=500", { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Source indisponible");
    return { events: parseWorldEvents(await response.json()), fetchedAt: new Date().toISOString(), error: null };
  } catch {
    return { events: [], fetchedAt: null, error: "Les données NASA sont momentanément indisponibles. Réessayez plus tard." };
  }
});

export const worldEventsQuery = queryOptions({ queryKey: ["world-events"], queryFn: () => getWorldEvents(), staleTime: 30 * 60 * 1000 });