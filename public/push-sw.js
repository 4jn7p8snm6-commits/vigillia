// VigillIA — service worker dédié aux notifications push uniquement (aucun cache).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function notificationMessage(event) {
  let data = {};
  try {
    let parsed = event.data ? event.data.json() : {};
    // Accepte aussi les messages JSON encodés en chaîne ou enveloppés.
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (parsed && typeof parsed === "object") {
      data = parsed.notification || parsed.payload || parsed;
      if (typeof data === "string") data = JSON.parse(data);
    }
  } catch (_) {
    try {
      data = { body: event.data ? event.data.text() : "" };
    } catch (_) {
      data = {};
    }
  }
  if (!data || typeof data !== "object") data = {};
  const text = (value) => typeof value === "string" ? value.trim() : "";
  const details = [];
  // Les champs structurés sont prioritaires, sans perdre les anciens messages.
  if ("location" in data || "severity" in data || "occurredAt" in data) {
    details.push(`Lieu : ${text(data.location) || "Non renseigné"}`);
    details.push(`Gravité : ${text(data.severity) || "Non renseignée"}`);
    const date = new Date(data.occurredAt);
    details.push(`Date : ${Number.isNaN(date.getTime()) ? "Non communiquée" : date.toLocaleString("fr-FR", {
      timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }) + " (heure de Paris)"}`);
    if (text(data.description)) details.push(text(data.description));
  } else {
    details.push(text(data.body) || "Alerte reçue sans détails.");
  }
  return {
    title: text(data.title) || "VigillIA — Alerte",
    body: details.join("\n"),
    tag: text(data.tag) || "vigillia",
    url: text(data.url) || "/",
  };
}

self.addEventListener("push", (event) => {
  const data = notificationMessage(event);
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      renotify: true,
      requireInteraction: data.tag !== "vigillia-test",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
