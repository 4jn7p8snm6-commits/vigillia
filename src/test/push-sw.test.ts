import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync("public/push-sw.js", "utf8");

async function receive(payload: unknown, raw = false) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const showNotification = vi.fn<(title: string, options: { body: string; requireInteraction: boolean }) => Promise<void>>().mockResolvedValue(undefined);
  runInNewContext(source, {
    self: {
      addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
      registration: { showNotification },
    },
  });
  let pending: Promise<unknown> | undefined;
  const push = handlers['push'];
  if (!push) throw new Error("Missing push handler");
  push({
    data: payload === undefined ? undefined : {
      json: () => { if (raw) throw new Error("Not JSON"); return payload; },
      text: () => String(payload),
    },
    waitUntil: (promise: Promise<unknown>) => { pending = promise; },
  });
  await pending;
  const call = showNotification.mock.calls[0];
  if (!call) throw new Error("Notification was not displayed");
  return call;
}

describe("Push display outside the app", () => {
  const alert = {
    title: "🔥 Incendie détecté — CRITIQUE", location: "Cuisine",
    severity: "CRITIQUE (95 %)", occurredAt: "2026-10-14T07:24:00Z",
    description: "Flammes visibles.", tag: "vigillia-incendie",
  };
  it.each([alert, { payload: alert }, { notification: alert }, JSON.stringify(alert)])(
    "shows the supplied location, severity and full timestamp",
    async (payload) => {
      const [title, options] = await receive(payload);
      expect(title).toBe(alert.title);
      expect(options.body).toContain("Lieu : Cuisine\nGravité : CRITIQUE (95 %)\nDate : 14/10/2026");
      expect(options.body).toContain("09:24:00 (heure de Paris)");
      expect(options.body).toContain("Flammes visibles.");
    },
  );
  it("keeps legacy bodies and plain-text messages", async () => {
    expect((await receive({ title: "🌊 Inondation", body: "Lieu : Garage" }))[1].body).toBe("Lieu : Garage");
    expect((await receive("Alerte réelle", true))[1].body).toBe("Alerte réelle");
  });
  it("never invents a location or event date", async () => {
    const [, options] = await receive({ severity: "Élevée", occurredAt: "invalid" });
    expect(options.body).toContain("Lieu : Non renseigné");
    expect(options.body).toContain("Date : Non communiquée");
    expect((await receive(undefined))[1].body).toBe("Alerte reçue sans détails.");
  });
  it("clearly marks test messages", async () => {
    const [title, options] = await receive({ ...alert, title: "🧪 TEST — VigillIA", severity: "TEST — aucun danger réel", tag: "vigillia-test" });
    expect(title).toContain("TEST");
    expect(options.body).toContain("aucun danger réel");
    expect(options.requireInteraction).toBe(false);
  });
});