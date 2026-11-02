import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { coordinatesSchema } from "./coordinates";

const inputSchema = z.object({
  image: z.string(),
  location: z.string().max(80).optional(),
  coordinates: coordinatesSchema.optional(),
});

export const analyzeSurveillanceFrame = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const { analyzeFrame } = await import("./detection.server");
    const { getSettings, applyThreshold, recordDetection } = await import("./monitor.server");
    const { recordAIHealth } = await import("./system-health.server");
    let raw;
    try { raw = await analyzeFrame(data.image, getRequest()); await recordAIHealth(true); }
    catch (error) { await recordAIHealth(false); throw error; }
    const settings = await getSettings();
    const result = applyThreshold(raw, settings.threshold);
    try {
      await recordDetection(result, data.image, data.location, "appareil", data.coordinates);
    } catch (e) {
      console.error("Enregistrement de la détection échoué", e);
    }
    return result;
  });
