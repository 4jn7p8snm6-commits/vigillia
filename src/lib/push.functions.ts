import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(200),
  auth: z.string().min(8).max(100),
  label: z.string().max(80).optional(),
});

export const registerPush = createServerFn({ method: "POST" })
  .inputValidator(subSchema)
  .handler(async ({ data }) => {
    const { saveSubscription } = await import("./push.server");
    await saveSubscription(data);
    return { ok: true };
  });

export const unregisterPush = createServerFn({ method: "POST" })
  .inputValidator(z.object({ endpoint: z.string().url().max(1000) }))
  .handler(async ({ data }) => {
    const { removeSubscription } = await import("./push.server");
    await removeSubscription(data.endpoint);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .inputValidator(z.object({ endpoint: z.string().url().max(1000) }))
  .handler(async ({ data }) => {
    const { sendTest } = await import("./push.server");
    return sendTest(data.endpoint);
  });
