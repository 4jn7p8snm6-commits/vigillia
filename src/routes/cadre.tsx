import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronDown, Phone, ShieldCheck, Eye, Database, Scale, Check } from "lucide-react";

export const Route = createFileRoute("/cadre")({
  head: () => ({
    meta: [
      { title: "Marco de uso y privacidad — VigillIA" },
      { name: "description", content: "Límites, uso previsto y tratamiento de datos personales de VigillIA." },
      { property: "og:title", content: "Marco de uso y privacidad — VigillIA" },
      { property: "og:description", content: "Lo que VigillIA hace, lo que no hace y cómo se tratan las imágenes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cadre,
});

const sections = [
  { icon: Eye, title: "Qué hace VigillIA", body: ["Las imágenes de las cámaras las analiza una IA generalista (GPT-6 Astra), que señala signos visuales de incendio o inundación.", "Cada alerta puede ser revisada por una persona (verdadera o falsa) para medir la fiabilidad real."] },
  { icon: Database, title: "Datos tratados", body: ["Solo se conservan las imágenes que han activado una alerta, en un espacio privado.", "Las imágenes sin peligro se analizan y no se guardan.", "La ubicación del dispositivo solo se usa con tu consentimiento explícito y siempre de forma aproximada.", "Las suscripciones a notificaciones no contienen nombre ni correo electrónico."] },
  { icon: Scale, title: "Antes de usarlo en el espacio público", body: ["Toda cámara que grabe la vía pública necesita las autorizaciones previstas por la ley e informar a las personas grabadas (RGPD).", "El responsable del tratamiento, el plazo de conservación y el contacto para ejercer tus derechos se definirán con el organismo que despliegue el sistema."] },
];

const checks = ["Entiendo que VigillIA no avisa al 112", "En caso de peligro, llamo yo al 112", "Tengo permiso para la cámara que uso"];

function Cadre() {
  const [open, setOpen] = useState<number | null>(0);
  const [done, setDone] = useState<boolean[]>(checks.map(() => false));
  const all = done.every(Boolean);
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 text-sm sm:p-6" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Volver</Link>
      <h1 className="text-2xl font-bold">Marco de uso y privacidad</h1>

      <section className="rounded-xl border border-danger/50 bg-danger/10 p-4">
        <h2 className="font-semibold">VigillIA es una herramienta de ayuda, no un servicio de emergencias</h2>
        <p className="mt-1">VigillIA no avisa a los bomberos, ni a la policía, ni al 112. El sistema está en fase experimental y no está certificado para la seguridad pública.</p>
        <a href="tel:112" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 font-semibold text-danger-foreground transition hover:opacity-90"><Phone className="h-4 w-4" />Llamar al 112</a>
      </section>

      <div className="space-y-2">
        {sections.map((s, i) => {
          const Icon = s.icon; const isOpen = open === i;
          return (
            <section key={s.title} className="overflow-hidden rounded-xl border border-border bg-card">
              <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-4 text-left hover:bg-secondary/50">
                <Icon className="h-5 w-5 text-primary" />
                <span className="flex-1 font-semibold">{s.title}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && <ul className="list-disc space-y-1 px-4 pb-4 pl-12 text-muted-foreground">{s.body.map((b) => <li key={b}>{b}</li>)}</ul>}
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />Comprueba que lo has entendido</h2>
        <div className="space-y-2">
          {checks.map((c, i) => (
            <button key={c} onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${done[i] ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded border ${done[i] ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{done[i] && <Check className="h-3 w-3" />}</span>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(done.filter(Boolean).length / checks.length) * 100}%` }} /></div>
        {all && <p className="mt-2 font-medium text-primary">¡Perfecto! Ya conoces los límites de VigillIA.</p>}
      </section>
    </main>
  );
}
