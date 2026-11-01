import { describe, expect, it } from "vitest";
import { coordinatesSchema, frameCoordinates } from "@/lib/coordinates";
import { parseDetectionMapEvents } from "@/lib/world-events";

describe("Geolocated detections", () => {
  const coordinates = { latitude: 28.1, longitude: -15.4 };
  it("uses consented device coordinates for device camera frames", () => {
    expect(frameCoordinates("webcam", coordinates)).toEqual(coordinates);
    expect(frameCoordinates("webcam", null)).toBeUndefined();
  });
  it("never uses device coordinates for imported images", () => {
    expect(frameCoordinates("upload", coordinates)).toBeUndefined();
  });
  it("requires configured coordinates for remote camera frames", () => {
    expect(frameCoordinates("ipcam", null)).toBeUndefined();
    expect(frameCoordinates("ipcam", coordinates)).toEqual(coordinates);
  });
  it("rejects impossible coordinates", () => {
    expect(coordinatesSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false);
    expect(coordinatesSchema.safeParse({ latitude: 0, longitude: -181 }).success).toBe(false);
  });
  it("includes actual fire detections on the map", () => {
    expect(parseDetectionMapEvents([{ id: "fire", kind: "wildfires", observed_at: "2026-11-01T11:29:00Z", ...coordinates }])[0]).toMatchObject({ kind: "wildfires", origin: "vigillia", ...coordinates });
  });
  it("includes actual flood detections on the map", () => {
    expect(parseDetectionMapEvents([{ id: "flood", kind: "floods", observed_at: "2026-11-01T11:29:00Z", ...coordinates }])[0]).toMatchObject({ kind: "floods", origin: "vigillia", ...coordinates });
  });
});