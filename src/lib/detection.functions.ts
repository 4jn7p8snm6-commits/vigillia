import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  image: z.string(),
});

export const analyzeSurveillanceFrame = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const { analyzeFrame } = await import("./detection.server");
    return analyzeFrame(data.image, getRequest());
  });
