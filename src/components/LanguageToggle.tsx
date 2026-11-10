import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { translateToSpanish } from "@/lib/translate.functions";

const CACHE_KEY = "vigillia-es-cache";
const LANG_KEY = "vigillia-lang";
const originals = new WeakMap<Text, string>();
const translatedValues = new WeakSet<Text>();

function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const p = n.parentElement;
      if (!p || p.closest("script,style,[data-no-translate]")) return NodeFilter.FILTER_REJECT;
      return /\p{L}{2,}/u.test(n.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) out.push(walker.currentNode as Text);
  return out;
}

export function LanguageToggle() {
  const translate = useServerFn(translateToSpanish);
  const [lang, setLang] = useState<"fr" | "es">("fr");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (localStorage.getItem(LANG_KEY) === "es") setLang("es"); }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === "fr") {
      for (const n of textNodes(document.body)) { const o = originals.get(n); if (o !== undefined) n.nodeValue = o; }
      return;
    }
    const cache: Record<string, string> = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
    let running = false; let again = false;
    const run = async () => {
      if (running) { again = true; return; }
      running = true;
      const nodes = textNodes(document.body).filter((n) => !(translatedValues.has(n) && Object.values(cache).includes(n.nodeValue ?? "")));
      const missing = new Set<string>();
      for (const n of nodes) {
        const src = (n.nodeValue ?? "").trim();
        if (cache[src] === undefined && !Object.values(cache).includes(src)) missing.add(src);
      }
      const list = [...missing];
      if (list.length) setBusy(true);
      for (let i = 0; i < list.length; i += 100) {
        const chunk = list.slice(i, i + 100);
        try { const { translations } = await translate({ data: { texts: chunk } }); chunk.forEach((s, j) => { cache[s] = translations[j]; }); }
        catch { /* keep French on failure */ }
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      setBusy(false);
      for (const n of textNodes(document.body)) {
        const raw = n.nodeValue ?? ""; const src = raw.trim(); const es = cache[src];
        if (es !== undefined && es !== src) { originals.set(n, raw); translatedValues.add(n); n.nodeValue = raw.replace(src, es); }
      }
      running = false;
      if (again) { again = false; void run(); }
    };
    void run();
    let t: ReturnType<typeof setTimeout>;
    const obs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => void run(), 300); });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => { obs.disconnect(); clearTimeout(t); };
  }, [lang, translate]);

  const toggle = () => { const next = lang === "fr" ? "es" : "fr"; localStorage.setItem(LANG_KEY, next); setLang(next); };
  return (
    <button data-no-translate onClick={toggle} aria-label={lang === "fr" ? "Traducir al español" : "Revenir en français"}
      className="fixed bottom-4 right-4 z-[1000] rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-lg"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      {busy ? "…" : lang === "fr" ? "🇪🇸 Español" : "🇫🇷 Français"}
    </button>
  );
}
