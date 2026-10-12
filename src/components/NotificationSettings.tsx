import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { registerPush, sendTestPush, unregisterPush } from "@/lib/push.functions";

const VAPID_PUBLIC_KEY =
  "BCm_am3lX6fwOqZlXzCuaAM_osKh7aVoxEe7ePi2Ne1P9_l4whl96yZ3B_H-GZ15httbBYuDI9UFAbBcJZ0_WO0";

type Status = "checking" | "unsupported" | "ios-install" | "preview" | "default" | "denied" | "enabled";

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isPreviewContext() {
  const h = location.hostname;
  return window.self !== window.top || h.startsWith("id-preview--") || h.startsWith("preview--") || h.endsWith("lovableproject.com");
}

export function NotificationSettings({ location: loc }: { location: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = async () => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isPreviewContext()) return setStatus("preview");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setStatus(ios && !standalone ? "ios-install" : "unsupported");
    }
    if (Notification.permission === "denied") return setStatus("denied");
    const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const sub = await reg?.pushManager.getSubscription();
    setStatus(sub && Notification.permission === "granted" ? "enabled" : "default");
  };

  useEffect(() => {
    void refresh();
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID_PUBLIC_KEY) }));
      const j = sub.toJSON();
      await registerPush({ data: { endpoint: j.endpoint ?? "", p256dh: j.keys?.["p256dh"] ?? "", auth: j.keys?.["auth"] ?? "", label: loc || undefined } });
      setStatus("enabled");
      setMsg({ ok: true, text: "Notifications activées sur cet appareil." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Activation impossible." });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unregisterPush({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setStatus("default");
      setMsg({ ok: true, text: "Notifications désactivées sur cet appareil." });
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) throw new Error("Activez d'abord les notifications.");
      await sendTestPush({ data: { endpoint: sub.endpoint } });
      setMsg({ ok: true, text: "Notification de TEST envoyée réellement. Elle doit arriver dans quelques secondes." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Échec de l'envoi." });
    } finally {
      setBusy(false);
    }
  };

  const labels: Record<Status, { text: string; tone: string }> = {
    checking: { text: "Vérification…", tone: "text-muted-foreground" },
    enabled: { text: "Activées — mode opérationnel", tone: "text-safe" },
    default: { text: "Non activées", tone: "text-muted-foreground" },
    denied: { text: "Refusées", tone: "text-danger" },
    unsupported: { text: "Non prises en charge par ce navigateur", tone: "text-warning" },
    "ios-install": { text: "Installez d'abord VigillIA sur l'écran d'accueil", tone: "text-warning" },
    preview: { text: "Indisponibles dans l'aperçu — ouvrez l'app publiée", tone: "text-warning" },
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Paramètres — Notifications</h2>
      </div>
      <p className={`mt-2 text-sm font-medium ${labels[status].tone}`}>État : {labels[status].text}</p>

      {status === "denied" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Réautorisez-les dans Réglages de l'appareil → Notifications → VigillIA.
        </p>
      )}
      {status === "ios-install" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Dans Safari : bouton Partager → « Sur l'écran d'accueil », puis ouvrez VigillIA depuis l'icône (iOS 16.4 minimum).
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {(status === "default" || status === "denied") && (
          <button
            onClick={enable}
            disabled={busy || status === "denied"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Activer les notifications
          </button>
        )}
        {status === "enabled" && (
          <>
            <button
              onClick={test}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer une notification de test
            </button>
            <button
              onClick={disable}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <BellOff className="h-4 w-4" />
              Désactiver
            </button>
          </>
        )}
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-safe" : "text-danger"}`}>{msg.text}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        Alertes envoyées pour : incendie, risque d'inondation, alerte critique (une seule fois par événement toutes les 10 min).
      </p>
    </div>
  );
}
