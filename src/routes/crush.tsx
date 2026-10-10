import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Upload, Loader2, ArrowLeft, Trash2, Sparkles } from "lucide-react";
import { analyzeCrushChat } from "@/lib/crush.functions";
import type { CrushResult } from "@/lib/crush.server";

export const Route = createFileRoute("/crush")({
  head: () => ({
    meta: [
      { title: "CrushMeter — Analyse l'intérêt de ton crush sur WhatsApp" },
      {
        name: "description",
        content:
          "Envoie tes captures, un enregistrement d'écran ou l'export de ta conversation WhatsApp : l'IA compte les messages et estime l'intérêt de ton crush.",
      },
      { property: "og:title", content: "CrushMeter — Il/elle est intéressé(e) ?" },
      {
        property: "og:description",
        content: "L'IA analyse ta conversation WhatsApp et te donne un score d'intérêt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrushPage,
});

type Profile = {
  userGender: string;
  crushGender: string;
  situation: string;
  duration: string;
  context: string;
};

const SITUATIONS = [
  "On vient de se rencontrer",
  "On se parle depuis un moment",
  "On est amis, je veux plus",
  "On s'est déjà vus en date",
  "C'est mon ex",
  "C'est compliqué",
];

function resizeToJpeg(src: CanvasImageSource, w: number, h: number): string {
  const max = 1280;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.75);
}

function loadImage(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      res(resizeToJpeg(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

async function extractFrames(file: File, count = 8): Promise<string[]> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.src = URL.createObjectURL(file);
  await new Promise<void>((r, j) => {
    video.onloadedmetadata = () => r();
    video.onerror = () => j(new Error("Vidéo illisible"));
  });
  const frames: string[] = [];
  const d = video.duration || 1;
  for (let i = 0; i < count; i++) {
    video.currentTime = (d * (i + 0.5)) / count;
    await new Promise<void>((r) => (video.onseeked = () => r()));
    frames.push(resizeToJpeg(video, video.videoWidth, video.videoHeight));
  }
  URL.revokeObjectURL(video.src);
  return frames;
}

// Parse WhatsApp export lines: "12/03/2024, 21:15 - Nom: message" or "[12/03/2024 21:15:00] Nom: message"
function parseWhatsApp(text: string) {
  const re = /^\[?\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?\]?\s*(?:-\s*)?([^:]{1,40}):\s/;
  const counts: Record<string, number> = {};
  let prev = "";
  const starts: Record<string, number> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const name = (m[1] ?? "").trim();
    counts[name] = (counts[name] || 0) + 1;
    if (name !== prev) starts[name] = (starts[name] || 0) + 1;
    prev = name;
  }
  return { counts, starts };
}

function CrushPage() {
  const [step, setStep] = useState<"quiz" | "upload" | "result">("quiz");
  const [profile, setProfile] = useState<Profile>({
    userGender: "",
    crushGender: "",
    situation: "",
    duration: "",
    context: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [myName, setMyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CrushResult | null>(null);

  const parsed = text ? parseWhatsApp(text) : null;
  const names = parsed ? Object.keys(parsed.counts) : [];

  const quizOk = profile.userGender && profile.crushGender && profile.situation && profile.duration;

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        if (f.type.startsWith("image/")) {
          const img = await loadImage(f);
          setImages((p) => [...p, img].slice(0, 12));
        } else if (f.type.startsWith("video/")) {
          const fr = await extractFrames(f);
          setImages((p) => [...p, ...fr].slice(0, 12));
        } else {
          const t = await f.text();
          setText(t.slice(-60000));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fichier illisible");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      let stats = "";
      if (parsed && names.length) {
        stats = names
          .map(
            (n) =>
              `${n}${n === myName ? " (moi)" : ""} : ${parsed.counts[n]} messages, ${parsed.starts[n]} séries de messages`,
          )
          .join("\n");
      }
      const r = await analyzeCrushChat({ data: { profile, images, text, stats } });
      setResult(r);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'analyse");
    } finally {
      setLoading(false);
    }
  }

  const Choice = ({
    value,
    current,
    onPick,
  }: {
    value: string;
    current: string;
    onPick: (v: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={`rounded-lg border px-3 py-2 text-sm transition ${
        current === value
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-muted"
      }`}
    >
      {value}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Heart className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold">CrushMeter</h1>
            <p className="text-xs text-muted-foreground">Est-ce qu'il/elle est intéressé(e) ?</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {step === "quiz" && (
          <section className="space-y-5 rounded-xl border border-border bg-card p-5">
            <h2 className="text-xl font-bold">D'abord, quelques questions</h2>
            <div className="space-y-2">
              <p className="text-sm font-medium">Tu es…</p>
              <div className="flex flex-wrap gap-2">
                {["Une fille", "Un garçon", "Autre"].map((v) => (
                  <Choice key={v} value={v} current={profile.userGender} onPick={(x) => setProfile({ ...profile, userGender: x })} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Ton crush est…</p>
              <div className="flex flex-wrap gap-2">
                {["Une fille", "Un garçon", "Autre"].map((v) => (
                  <Choice key={v} value={v} current={profile.crushGender} onPick={(x) => setProfile({ ...profile, crushGender: x })} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Votre situation</p>
              <div className="flex flex-wrap gap-2">
                {SITUATIONS.map((v) => (
                  <Choice key={v} value={v} current={profile.situation} onPick={(x) => setProfile({ ...profile, situation: x })} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Vous parlez depuis…</p>
              <div className="flex flex-wrap gap-2">
                {["Quelques jours", "Quelques semaines", "Quelques mois", "Plus d'un an"].map((v) => (
                  <Choice key={v} value={v} current={profile.duration} onPick={(x) => setProfile({ ...profile, duration: x })} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Un détail à savoir ? (facultatif)</p>
              <textarea
                value={profile.context}
                onChange={(e) => setProfile({ ...profile, context: e.target.value })}
                placeholder="Ex : on est dans la même classe, il/elle répond vite le soir…"
                className="w-full rounded-lg border border-input bg-background p-3 text-sm"
                rows={2}
              />
            </div>
            <button
              disabled={!quizOk}
              onClick={() => setStep("upload")}
              className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-40"
            >
              Continuer
            </button>
          </section>
        )}

        {step === "upload" && (
          <section className="space-y-5 rounded-xl border border-border bg-card p-5">
            <h2 className="text-xl font-bold">Envoie ta conversation</h2>
            <p className="text-sm text-muted-foreground">
              Captures d'écran, enregistrement d'écran, ou fichier exporté depuis WhatsApp
              (Discussion → ⋮ → Plus → Exporter la discussion → sans médias).
            </p>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:bg-muted">
              {busy ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8 text-primary" />}
              <span className="font-medium">Choisir des fichiers</span>
              <span className="text-xs text-muted-foreground">Images, vidéo ou .txt</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.txt,text/plain"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>

            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{images.length} image(s)</span>
                  <button onClick={() => setImages([])} className="inline-flex items-center gap-1 text-muted-foreground">
                    <Trash2 className="h-4 w-4" /> Vider
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {images.map((src, i) => (
                    <img key={i} src={src} alt="" className="aspect-[9/16] w-full rounded object-cover" />
                  ))}
                </div>
              </div>
            )}

            {parsed && names.length > 0 && (
              <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Compteur de messages</p>
                {names.map((n) => (
                  <div key={n} className="flex justify-between">
                    <span>{n}</span>
                    <span className="font-mono">{parsed.counts[n]}</span>
                  </div>
                ))}
                <p className="pt-2 font-medium">C'est qui toi ?</p>
                <div className="flex flex-wrap gap-2">
                  {names.map((n) => (
                    <Choice key={n} value={n} current={myName} onPick={setMyName} />
                  ))}
                </div>
              </div>
            )}
            {text && names.length === 0 && (
              <p className="text-sm text-muted-foreground">Fichier texte chargé ({text.length} caractères).</p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep("quiz")} className="rounded-lg border border-border px-4 py-3">
                Retour
              </button>
              <button
                disabled={loading || busy || (!images.length && !text)}
                onClick={analyze}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {loading ? "Analyse en cours…" : "Analyser"}
              </button>
            </div>
          </section>
        )}

        {step === "result" && result && (
          <section className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Taux d'intérêt</p>
              <p className="text-6xl font-black text-primary">{Math.round(result.scoreInteret)}%</p>
              <div className="mx-auto mt-3 h-3 max-w-xs overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, result.scoreInteret))}%` }} />
              </div>
              <p className="mt-4 text-lg font-semibold">{result.verdict}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Tes messages" value={result.messagesMoi} />
              <Stat label="Ses messages" value={result.messagesCrush} />
              <Stat label="Tu relances" value={result.initiativesMoi} />
              <Stat label="Il/elle relance" value={result.initiativesCrush} />
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <span className="font-medium">Délai de réponse : </span>
              {result.delaiReponse}
            </div>

            <List title="✅ Signaux positifs" items={result.signauxPositifs} />
            <List title="⚠️ Signaux négatifs" items={result.signauxNegatifs} />
            <List title="💡 Conseils" items={result.conseils} />

            <div className="rounded-xl border border-primary bg-card p-4">
              <p className="mb-1 text-sm font-medium">Message à envoyer</p>
              <p className="italic">« {result.prochainMessage} »</p>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setImages([]);
                setText("");
                setStep("upload");
              }}
              className="w-full rounded-lg border border-border py-3"
            >
              Analyser une autre conversation
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Analyse indicative et pour le fun — rien ne remplace une vraie discussion.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 font-medium">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
