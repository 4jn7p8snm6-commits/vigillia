import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  profile: z.object({
    userGender: z.string(),
    crushGender: z.string(),
    situation: z.string(),
    duration: z.string(),
    context: z.string(),
  }),
  images: z.array(z.string()).max(12),
  text: z.string().max(60000),
  stats: z.string(),
});

export type CrushInput = z.infer<typeof inputSchema>;

export const analyzeCrushChat = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const { analyzeCrush } = await import("./crush.server");
    return analyzeCrush(data, getRequest());
  });
