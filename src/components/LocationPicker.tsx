import { useState } from "react";
import { LocateFixed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { coordinatesSchema, type Coordinates } from "@/lib/coordinates";

export function LocationPicker({ value, onChange, allowDevice = false }: { value: Coordinates | null; onChange: (value: Coordinates | null) => void; allowDevice?: boolean }) {
  const [latitude, setLatitude] = useState(value ? String(value.latitude) : "");
  const [longitude, setLongitude] = useState(value ? String(value.longitude) : "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const apply = (lat: string, lon: string) => {
    setLatitude(lat); setLongitude(lon);
    const parsed = coordinatesSchema.safeParse({ latitude: Number(lat), longitude: Number(lon) });
    onChange(lat.trim() && lon.trim() && parsed.success ? parsed.data : null);
  };
  const locate = () => {
    if (!navigator.geolocation) { setMessage("Localisation indisponible."); return; }
    setBusy(true); setMessage("");
    navigator.geolocation.getCurrentPosition((position) => {
      apply(String(position.coords.latitude), String(position.coords.longitude));
      setBusy(false);
    }, () => { setBusy(false); setMessage("Localisation refusée ou indisponible. Vous pouvez saisir les coordonnées."); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  return <div className="mt-3 space-y-2">
    <p className="text-xs font-medium">Position de la caméra sur la carte publique</p>
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs">Latitude<input aria-label="Latitude de la caméra" type="number" step="any" min={-90} max={90} value={latitude} onChange={(e) => apply(e.target.value, longitude)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5" /></label>
      <label className="text-xs">Longitude<input aria-label="Longitude de la caméra" type="number" step="any" min={-180} max={180} value={longitude} onChange={(e) => apply(latitude, e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5" /></label>
    </div>
    <div className="flex flex-wrap gap-2">
      {allowDevice && <Button size="sm" variant="outline" disabled={busy} onClick={locate}><LocateFixed />{busy ? "Localisation…" : "Autoriser ma position sur la carte"}</Button>}
      {(latitude || longitude) && <Button size="icon" variant="ghost" aria-label="Retirer la position" title="Retirer la position" onClick={() => apply("", "")}><X /></Button>}
    </div>
    <p className="text-xs text-muted-foreground">{value ? "Les prochaines détections seront visibles publiquement à une position approximative (environ 1 km)." : "Sans coordonnées, les alertes restent dans le journal, sans point sur la carte."}</p>
    {message && <p role="status" className="text-xs text-warning">{message}</p>}
  </div>;
}