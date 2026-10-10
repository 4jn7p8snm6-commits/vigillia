import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  image: z.string(),
});

export const analyzeSurveillanceFrame = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data, request }) => {
    const { analyzeFrame } = await import("./detection.server");
    return analyzeFrame(data.image, request);
  });
