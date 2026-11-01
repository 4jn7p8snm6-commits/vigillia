import { z } from "zod";

export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export function frameCoordinates(source: "webcam" | "ipcam" | "upload", coordinates: Coordinates | null) {
  return source === "upload" ? undefined : coordinates ?? undefined;
}