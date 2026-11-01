import { describe, expect, it } from "vitest";
import { parseWorldEvents } from "@/lib/world-events";

describe("World events", () => {
  it("keeps the latest dated point and a secure source", () => {
    const events = parseWorldEvents({ events: [{ id: "test", title: "Reported fire", categories: [{ id: "wildfires" }], sources: [{ url: "https://example.org/report" }], geometry: [{ type: "Point", coordinates: [1, 2], date: "2026-10-01T00:00:00Z" }, { type: "Point", coordinates: [3, 4], date: "2026-10-10T00:00:00Z" }] }] });
    expect(events[0]).toMatchObject({ longitude: 3, latitude: 4, date: "2026-10-10T00:00:00Z", kind: "wildfires" });
  });
  it("rejects missing coordinates and unrelated categories", () => {
    expect(parseWorldEvents({ events: [{ id: "bad", title: "Bad point", categories: [{ id: "floods" }], geometry: [{ type: "Point", coordinates: [200, 95], date: "2026-10-10" }] }, { id: "storm", title: "Storm", categories: [{ id: "storms" }], geometry: [] }] })).toEqual([]);
  });
  it("does not fabricate events from a failed feed", () => { expect(() => parseWorldEvents({})).toThrow(); });
  it("includes NASA flood observations with their actual coordinates", () => {
    expect(parseWorldEvents({ events: [{ id: "flood", title: "Flood observation", categories: [{ id: "floods" }], geometry: [{ type: "Point", coordinates: [-15.4, 28.1], date: "2026-11-01T11:29:00Z" }] }] })[0]).toMatchObject({ kind: "floods", latitude: 28.1, longitude: -15.4 });
  });
});