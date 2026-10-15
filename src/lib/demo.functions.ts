import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const analyzeDemoImage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ image: z.string().max(2_000_000).regex(/^data:image\/jpeg;base64,/) }))
  .handler(async ({ data }) => {
    const { analyzeFrame } = await import("./detection.server");
    // Deliberately isolated: no detection persistence or notification dispatch.
    return analyzeFrame(data.image, getRequest());
  });