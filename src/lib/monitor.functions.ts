import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { coordinatesSchema } from "./coordinates";

export const getMonitorSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { publicSettings } = await import("./monitor.server");
  return publicSettings();
});

export const saveMonitorSettings = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    const { updateSettings } = await import("./monitor.server");
    await updateSettings({ ...data, coordinates: data.coordinates ?? null });
    return { ok: true };
  });

export const runMonitorNow = createServerFn({ method: "POST" }).handler(async () => {
  const { runTick } = await import("./monitor.server");
  return runTick(true);
});

export const getDetections = createServerFn({ method: "GET" }).handler(async () => {
  const { listDetections } = await import("./monitor.server");
  return listDetections();
});

export const reviewDetectionFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), false_alert: z.boolean().nullable() }))
  .handler(async ({ data }) => {
    const { reviewDetection } = await import("./monitor.server");
    await reviewDetection(data.id, data.false_alert);
    return { ok: true };
  });
