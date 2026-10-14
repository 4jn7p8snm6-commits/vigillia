import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/surveillance-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
        const { getSettings, runTick } = await import("@/lib/monitor.server");
        const s = await getSettings();
        if (!token || token !== s.cron_token) return new Response("Unauthorized", { status: 401 });
        const r = await runTick();
        return Response.json({ ok: true, status: r.status.startsWith("Erreur") ? "error" : "done" });
      },
    },
  },
});
