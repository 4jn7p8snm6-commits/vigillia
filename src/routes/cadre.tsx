import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/cadre")({
  head: () => ({
    meta: [
      { title: "Cadre d'utilisation et confidentialité — VigillIA" },
      { name: "description", content: "Limites, usage prévu et traitement des données personnelles de VigillIA." },
      { property: "og:title", content: "Cadre d'utilisation et confidentialité — VigillIA" },
      { property: "og:description", content: "Ce que VigillIA fait, ce qu'il ne fait pas, et comment les images sont traitées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cadre,
});

function Cadre() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 text-sm sm:p-6" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Retour</Link>
      <h1 className="text-2xl font-bold">Cadre d'utilisation et confidentialité</h1>
      <section className="rounded-xl border border-danger/50 bg-danger/10 p-4">
        <h2 className="font-semibold">VigillIA est un outil d'aide, pas un service d'urgence</h2>
        <p className="mt-1">VigillIA ne prévient ni les pompiers, ni la police, ni le 112. En cas de danger, appelez le <strong>112</strong>. Le système est en phase expérimentale et n'a pas été certifié pour la sécurité publique.</p>
      </section>
      <section><h2 className="font-semibold">Ce que fait VigillIA</h2>
        <p className="text-muted-foreground">Des images de caméras sont analysées par une IA généraliste (GPT-6 Astra) qui signale les signes visuels d'incendie ou d'inondation. Chaque alerte peut être vérifiée par une personne (vraie ou fausse) pour mesurer la fiabilité réelle.</p></section>
      <section><h2 className="font-semibold">Données traitées</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Seules les images ayant déclenché une alerte sont conservées, dans un espace privé.</li>
          <li>Les images sans danger sont analysées puis non enregistrées.</li>
          <li>La position de l'appareil n'est utilisée qu'avec votre accord explicite ; la carte publique n'affiche que des positions arrondies, sans photo ni nom de caméra.</li>
          <li>Les abonnements aux notifications ne contiennent ni nom ni adresse email.</li>
        </ul></section>
      <section><h2 className="font-semibold">Avant une utilisation dans l'espace public</h2>
        <p className="text-muted-foreground">Toute caméra filmant la voie publique nécessite les autorisations prévues par la loi et une information des personnes filmées (RGPD). Le responsable du traitement, la durée de conservation et le contact pour exercer vos droits seront définis avec l'organisme qui déploie le système.</p></section>
    </main>
  );
}
