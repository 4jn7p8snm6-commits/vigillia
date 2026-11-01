import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { WorldEvent } from "@/lib/world-events";
import "leaflet/dist/leaflet.css";

function FocusEvent({ event }: { event: WorldEvent | null }) {
  const map = useMap();
  useEffect(() => {
    if (event) map.setView([event.latitude, event.longitude], 9, { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  }, [event, map]);
  return null;
}

export default function WorldMap({ events, selected, onSelect }: { events: WorldEvent[]; selected: WorldEvent | null; onSelect: (event: WorldEvent) => void }) {
  return <MapContainer center={[27.95, -15.6]} zoom={9} minZoom={2} className="world-map" scrollWheelZoom={false}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <FocusEvent event={selected} />
    {events.map((event) => <CircleMarker key={event.id} center={[event.latitude, event.longitude]} radius={selected?.id === event.id ? 10 : 6} pathOptions={{ className: event.kind === "wildfires" ? "map-fire" : "map-flood" }} eventHandlers={{ click: () => onSelect(event) }}>
      <Popup><strong>{event.title}</strong><br />{event.kind === "wildfires" ? "Incendie" : "Inondation"}<br />Observation : {new Date(event.date).toLocaleString("fr-FR")}<br />{event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">Consulter la source</a>}</Popup>
    </CircleMarker>)}
  </MapContainer>;
}