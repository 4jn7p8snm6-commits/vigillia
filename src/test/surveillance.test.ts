import { describe, expect, it } from "vitest";
import { dailyTrend, healthState } from "@/lib/surveillance";
describe("Surveillance dashboard", () => {
  const now = Date.parse("2026-11-02T16:32:00Z");
  it("does not present untested AI or cameras as operational", () => {
    expect(healthState(null, null, now)).toBe("unknown");
  });
  it("only confirms recently successful checks", () => {
    expect(healthState(true, "2026-11-02T16:31:00Z", now)).toBe("ok");
    expect(healthState(false, "2026-11-02T16:31:00Z", now)).toBe("error");
    expect(healthState(true, "2026-11-01T16:31:00Z", now)).toBe("stale");
  });
  it("preserves actual daily fire and flood counts across thirty days", () => {
    const days = dailyTrend([{ day: "2026-11-02", total: 3, fires: 2, floods: 1 }], "2026-11-02T16:32:00Z");
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toEqual({ day: "2026-11-02", total: 3, fires: 2, floods: 1 });
    expect(days[0]?.total).toBe(0);
  });
});