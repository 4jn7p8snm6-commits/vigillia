import { BarChart3, Flame, Waves } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dailyTrend, type Overview } from "@/lib/surveillance";

export function SurveillanceStats({ overview }: { overview: Overview }) {
  const { stats } = overview;
  return <section aria-label="Statistiques des détections">
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><BarChart3 className="h-5 w-5 text-primary" />Statistiques</h2>
    <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
      {[{ label: "Incidents détectés", value: stats.total }, { label: "Incendies", value: stats.fires }, { label: "Inondations", value: stats.floods }, { label: "Fausses alertes identifiées", value: stats.false_alerts }].map((item) => <div key={item.label} className="border-l-2 border-border pl-3"><dd className="text-3xl font-semibold tabular-nums">{item.value}</dd><dt className="mt-1 text-xs text-muted-foreground">{item.label}</dt></div>)}
    </dl>
    <p className="mt-3 text-xs text-muted-foreground">Historique complet · Un incident peut comporter feu et inondation. {stats.unreviewed} incident(s) non évalué(s) ; zéro fausse alerte identifiée ne prouve pas leur absence.</p>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">Évolution des détections · 30 jours</h3><div className="flex gap-3 text-xs"><span className="flex items-center gap-1"><Flame className="h-3 w-3 text-danger" />Incendies</span><span className="flex items-center gap-1"><Waves className="h-3 w-3 text-primary" />Inondations</span></div></div>
    <div className="mt-3 h-48 w-full" aria-label="Évolution quotidienne des incendies et inondations">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={dailyTrend(overview.trend, overview.synced_at)}><XAxis dataKey="day" tickFormatter={(day: string) => day.slice(5)} stroke="var(--muted-foreground)" fontSize={10} minTickGap={24} /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={10} width={30} /><Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} /><Bar dataKey="fires" name="Incendies" fill="var(--danger)" isAnimationActive={false} /><Bar dataKey="floods" name="Inondations" fill="var(--primary)" isAnimationActive={false} /></BarChart></ResponsiveContainer>
    </div>
    {stats.total === 0 && <p className="text-xs text-muted-foreground">Aucun incident enregistré.</p>}
  </section>;
}