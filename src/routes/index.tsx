import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Flame,
  Waves,
  ShieldCheck,
  Camera,
  CameraOff,
  Upload,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { analyzeSurveillanceFrame } from "@/lib/detection.functions";
import type { DetectionResult } from "@/lib/detection.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VigilIA — Détection d'incendies et d'inondations par IA" },
      {
        name: "description",
        content:
          "Surveillance en direct par intelligence artificielle : détection automatique des incendies et inondations sur le flux de votre caméra, avec alertes instantanées.",
      },
      { property: "og:title", content: "VigilIA — Détection d'incendies et d'inondations par IA" },
      {
        property: "og:description",
        content:
          "Surveillance en direct par IA : détection automatique des incendies et inondations avec alertes instantanées.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type HistoryEntry = {
  id: number;
  time: string;
  result: DetectionResult;
  alert: boolean;
};

const ANALYSIS_INTERVAL_MS = 5000;

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = 880;
      const start = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.start(start);
      osc.stop(start + 0.2);
    }
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // audio indisponible
  }
}

function ConfidenceBar({ label, value, danger }: { label: string; value: number; danger: boolean }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={danger ? "font-semibold text-danger" : "text-muted-foreground"}>{pct} %</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${danger ? "bg-danger" : "bg-safe"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Index() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DetectionResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const alertActive =
    lastResult !== null && (lastResult.incendie.detecte || lastResult.inondation.detecte);

  const stopMonitoring = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setMonitoring(false);
  }, []);

  const stopCamera = useCallback(() => {
    stopMonitoring();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, [stopMonitoring]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError(
        "Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur, ou utilisez l'import d'image ci-dessous.",
      );
    }
  };

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 768 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const runAnalysis = useCallback(async (image: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeSurveillanceFrame({ data: { image } });
      setLastResult(result);
      const alert = result.incendie.detecte || result.inondation.detecte;
      if (alert) playAlertSound();
      setHistory((prev) =>
        [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString("fr-FR"),
            result,
            alert,
          },
          ...prev,
        ].slice(0, 50),
      );
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "L'analyse a échoué. Nouvelle tentative au prochain cycle.",
      );
    } finally {
      busyRef.current = false;
      setAnalyzing(false);
    }
  }, []);

  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const requestWakeLock = async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
      };
      if (nav.wakeLock) wakeLockRef.current = await nav.wakeLock.request("screen");
    } catch {
      // non pris en charge
    }
  };

  const beginMonitoringLoop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMonitoring(true);
    localStorage.setItem("vigilia-auto", "1");
    void requestWakeLock();
    const tick = () => {
      const frame = captureFrame();
      if (frame) void runAnalysis(frame);
    };
    tick();
    timerRef.current = setInterval(tick, ANALYSIS_INTERVAL_MS);
  };

  const startMonitoring = () => {
    if (!cameraOn) return;
    beginMonitoringLoop();
  };

  const manualStop = () => {
    localStorage.removeItem("vigilia-auto");
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
    stopMonitoring();
  };

  // Mode 24/7 : reprise automatique à l'ouverture et au retour au premier plan
  useEffect(() => {
    const resume = async () => {
      if (localStorage.getItem("vigilia-auto") !== "1") return;
      if (document.visibilityState !== "visible") return;
      if (!streamRef.current || !streamRef.current.active) {
        await startCamera();
      }
      if (streamRef.current?.active) beginMonitoringLoop();
    };
    void resume();
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await runAnalysis(dataUrl);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">VigilIA</h1>
              <p className="text-xs text-muted-foreground">
                Détection d'incendies et d'inondations par IA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                monitoring
                  ? "bg-safe/15 text-safe"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${monitoring ? "animate-pulse-alert bg-safe" : "bg-muted-foreground"}`}
              />
              {monitoring ? "Surveillance active" : "En veille"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {alertActive && (
          <div className="mb-6 animate-pulse-alert rounded-xl border border-danger bg-danger/15 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-danger" />
              <div>
                <p className="text-glow-danger font-bold text-danger">
                  ALERTE —{" "}
                  {[
                    lastResult.incendie.detecte ? "Incendie détecté" : null,
                    lastResult.inondation.detecte ? "Inondation détectée" : null,
                  ]
                    .filter(Boolean)
                    .join(" et ")}
                </p>
                <p className="text-sm text-foreground/80">{lastResult.resume}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative aspect-video bg-secondary scanline">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${cameraOn ? "" : "hidden"}`}
                />
                {!cameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <CameraOff className="h-10 w-10" />
                    <p className="text-sm">Caméra désactivée</p>
                  </div>
                )}
                {analyzing && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyse en cours…
                  </div>
                )}
                {monitoring && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-danger/90 px-3 py-1 text-xs font-semibold text-danger-foreground">
                    <span className="h-2 w-2 animate-pulse-alert rounded-full bg-danger-foreground" />
                    REC
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-border p-4">
                {!cameraOn ? (
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Camera className="h-4 w-4" />
                    Activer la caméra
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
                  >
                    <CameraOff className="h-4 w-4" />
                    Couper la caméra
                  </button>
                )}

                {cameraOn &&
                  (!monitoring ? (
                    <button
                      onClick={startMonitoring}
                      className="inline-flex items-center gap-2 rounded-lg bg-safe px-4 py-2 text-sm font-semibold text-safe-foreground transition-colors hover:bg-safe/90"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Démarrer la surveillance
                    </button>
                  ) : (
                    <button
                      onClick={stopMonitoring}
                      className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground transition-colors hover:bg-danger/90"
                    >
                      Arrêter la surveillance
                    </button>
                  ))}

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  Analyser une image
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            </div>

            {cameraError && (
              <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                {cameraError}
              </p>
            )}
            {analysisError && (
              <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {analysisError}
              </p>
            )}

            {lastResult && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div
                  className={`rounded-xl border p-4 ${
                    lastResult.incendie.detecte
                      ? "border-danger bg-danger/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flame
                      className={`h-5 w-5 ${lastResult.incendie.detecte ? "text-danger" : "text-muted-foreground"}`}
                    />
                    <h2 className="font-semibold">Incendie</h2>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                        lastResult.incendie.detecte
                          ? "bg-danger text-danger-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {lastResult.incendie.detecte ? "DÉTECTÉ" : "Aucun signe"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{lastResult.incendie.description}</p>
                  <div className="mt-3">
                    <ConfidenceBar
                      label="Niveau de confiance"
                      value={lastResult.incendie.confiance}
                      danger={lastResult.incendie.detecte}
                    />
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-4 ${
                    lastResult.inondation.detecte
                      ? "border-danger bg-danger/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Waves
                      className={`h-5 w-5 ${lastResult.inondation.detecte ? "text-danger" : "text-muted-foreground"}`}
                    />
                    <h2 className="font-semibold">Inondation</h2>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                        lastResult.inondation.detecte
                          ? "bg-danger text-danger-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {lastResult.inondation.detecte ? "DÉTECTÉE" : "Aucun signe"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{lastResult.inondation.description}</p>
                  <div className="mt-3">
                    <ConfidenceBar
                      label="Niveau de confiance"
                      value={lastResult.inondation.confiance}
                      danger={lastResult.inondation.detecte}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-semibold">Historique des analyses</h2>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Effacer
                </button>
              )}
            </div>
            <div className="max-h-[32rem] overflow-y-auto p-2">
              {history.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Aucune analyse pour le moment. Démarrez la surveillance ou importez une image.
                </p>
              ) : (
                <ul className="space-y-2">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className={`rounded-lg border p-3 text-sm ${
                        entry.alert ? "border-danger/50 bg-danger/10" : "border-border bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{entry.time}</span>
                        {entry.alert ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                            <AlertTriangle className="h-3 w-3" />
                            Alerte
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-safe">RAS</span>
                        )}
                      </div>
                      <p className="mt-1 text-foreground/90">{entry.result.resume}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          VigilIA analyse une image toutes les {ANALYSIS_INTERVAL_MS / 1000} secondes pendant la
          surveillance. Les alertes sont données à titre indicatif et ne remplacent pas les systèmes
          de sécurité certifiés.
        </p>
      </main>
    </div>
  );
}
