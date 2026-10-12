import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  image: z.string(),
  location: z.string().max(80).optional(),
});

export const analyzeSurveillanceFrame = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const { analyzeFrame } = await import("./detection.server");
    const result = await analyzeFrame(data.image, getRequest());
    if (result.incendie.detecte || result.inondation.detecte) {
      try {
        const { notifyDetection } = await import("./push.server");
        await notifyDetection(result, data.location);
      } catch (e) {
        console.error("Envoi des notifications échoué", e);
      }
    }
    return result;
  });
