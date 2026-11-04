import { describe, it, expect } from "vitest";
import { reliability } from "@/lib/reliability";
describe("reliability", () => {
  it("calcule la précision sur les seules alertes revues", () => {
    const r = reliability([{ false_alert: false }, { false_alert: false }, { false_alert: false }, { false_alert: true }, { false_alert: null }]);
    expect(r.precision).toBe(0.75);
    expect(r.unreviewed).toBe(1);
  });
  it("aucune précision sans revue", () => {
    expect(reliability([{ false_alert: null }]).precision).toBeNull();
  });
});
