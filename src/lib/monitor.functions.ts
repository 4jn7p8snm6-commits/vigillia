import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { coordinatesSchema } from "./coordinates";

export const getMonitorSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole } = await import("./roles.server");
    await requireRole(context.supabase, context.userId, ["admin", "agent"]);
    const { publicSettings } = await import("./monitor.server");
    return publicSettings();
  });

export const saveMonitorSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      camera_url: z.union([z.literal(""), z.string().url().max(500).regex(/^https?:\/\//)]),
      location: z.string().max(80),
      enabled: z.boolean(),
      threshold: z.number().min(0.3).max(0.95),
      coordinates: coordinatesSchema.nullable().optional(),
      zone_radius_m: z.number().int().min(10).max(10000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./roles.server");
    await requireRole(context.supabase, context.userId, ["admin"]);
    const { updateSettings } = await import("./monitor.server");
    await updateSettings({ ...data, coordinates: data.coordinates ?? null });
    return { ok: true };
  });

export const runMonitorNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole } = await import("./roles.server");
    await requireRole(context.supabase, context.userId, ["admin"]);
    const { runTick } = await import("./monitor.server");
    return runTick(true);
  });

export const getDetections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole } = await import("./roles.server");
    await requireRole(context.supabase, context.userId, ["admin", "agent"]);
    const { listDetections } = await import("./monitor.server");
    return listDetections();
  });

export const reviewDetectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), false_alert: z.boolean().nullable() }))
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./roles.server");
    await requireRole(context.supabase, context.userId, ["admin", "agent"]);
    const { reviewDetection } = await import("./monitor.server");
    await reviewDetection(data.id, data.false_alert, context.userId);
    return { ok: true };
  });
