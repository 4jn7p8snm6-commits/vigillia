import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { getNotificationHistory } from "@/lib/push.functions";

type Row = Awaited<ReturnType<typeof getNotificationHistory>>[number];

export function NotificationHistory({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setRows(await getNotificationHistory());
    } catch {
      setError("Historique indisponible pour le moment.");
    }
  };

  useEffect(() => {
    const t = setTimeout(() => void load(), refreshKey ? 1500 : 0);
    return () => clearTimeout(t);
  }, [refreshKey]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Notifications envoyées</h2>
        </div>
        <button onClick={() => void load()} aria-label="Actualiser" className="text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {rows && rows.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Aucune notification envoyée pour l'instant.</p>}
      {rows && rows.length > 0 && (
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
          {rows.map((r) => {
            const ok = r.sent_count > 0 && r.failed_count === 0;
            const none = r.sent_count === 0 && r.failed_count === 0;
            return (
              <li key={r.id} className="rounded-lg border border-border bg-secondary/50 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.title ?? r.kind}</span>
                  <span className={ok ? "text-safe" : none ? "text-muted-foreground" : r.sent_count ? "text-warning" : "text-danger"}>
                    {none ? "Aucun appareil" : ok ? "Envoyée" : r.sent_count ? "Partielle" : "Échec"}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("fr-FR")} · {r.is_test ? "Test" : `Gravité ${r.severity}`}
                  {r.location ? ` · ${r.location}` : ""} · {r.sent_count} reçue(s), {r.failed_count} échec(s)
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
