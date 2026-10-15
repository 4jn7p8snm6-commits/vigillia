import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Loader2, Play, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeDemoImage } from "@/lib/demo.functions";
import fire from "@/assets/demo-fire.jpg";
import flood from "@/assets/demo-flood.jpg";

export function DetectionDemo() {
  const [mode, setMode] = useState<"fire" | "flood">("fire");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const analyze = useServerFn(analyzeDemoImage);
  const run = async () => {
    setBusy(true); setResult(null);
    try {
      const blob = await (await fetch(mode === "fire" ? fire : flood)).blob();
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error()); reader.onerror = reject; reader.readAsDataURL(blob); });
      const r = await analyze({ data: { image } });
      setResult(`${r.resume} · Incendie : ${Math.round(r.incendie.confiance * 100)} % · Inondation : ${Math.round(r.inondation.confiance * 100)} %`);
    } catch { setResult("L’analyse n’a pas abouti. Réessayez plus tard."); }
    finally { setBusy(false); }
  };
  return <section className="mt-6 border-t border-border pt-5" aria-label="Démonstration sans caméra">
    <h2 className="text-base font-semibold">Démonstration sans caméra</h2>
    <p className="my-2 text-xs text-muted-foreground">Images d’exemple générées. Analyse IA réelle, sans notification ni ajout au journal des alertes.</p>
    <div className="mb-3 flex gap-2"><Button size="sm" disabled={busy} variant={mode === "fire" ? "default" : "outline"} aria-pressed={mode === "fire"} onClick={() => { setMode("fire"); setResult(null); }}><Flame />Incendie</Button><Button size="sm" disabled={busy} variant={mode === "flood" ? "default" : "outline"} aria-pressed={mode === "flood"} onClick={() => { setMode("flood"); setResult(null); }}><Waves />Inondation</Button></div>
    <img src={mode === "fire" ? fire : flood} alt={mode === "fire" ? "Exemple généré d’un feu de palette" : "Exemple généré d’une cour inondée"} width={1024} height={768} loading="lazy" className="aspect-video w-full rounded-md object-cover" />
    <Button className="mt-3" size="sm" disabled={busy} onClick={() => void run()}>{busy ? <Loader2 className="animate-spin" /> : <Play />}{busy ? "Analyse en cours…" : "Analyser cet exemple"}</Button>
    {result && <p className="mt-3 text-sm" role="status">{result}</p>}
  </section>;
}