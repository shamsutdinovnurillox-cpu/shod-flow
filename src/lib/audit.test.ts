import { describe, it, expect } from "vitest";
import { changedFields } from "./audit";

describe("changedFields (audit diff, PRD 3)", () => {
  it("o'zgargan maydonlarni from/to bilan qaytaradi", () => {
    const before = { location: "Chicago", cost: 100, notes: null };
    const after = { location: "Dallas", cost: 100 };
    expect(changedFields(before, after)).toEqual({
      location: { from: "Chicago", to: "Dallas" },
    });
  });

  it("undefined maydonlar (berilmagan) e'tiborga olinmaydi", () => {
    const before = { a: 1, b: 2 };
    const after = { a: undefined, b: 3 };
    expect(changedFields(before, after)).toEqual({ b: { from: 2, to: 3 } });
  });

  it("Date qiymatlari ISO string sifatida solishtiriladi", () => {
    const d1 = new Date("2026-01-01");
    const d2 = new Date("2026-06-01");
    expect(changedFields({ date: d1 }, { date: d2 })).toEqual({
      date: { from: d1.toISOString(), to: d2.toISOString() },
    });
    expect(changedFields({ date: d1 }, { date: new Date("2026-01-01") })).toBeNull();
  });

  it("o'zgarish bo'lmasa null qaytaradi", () => {
    expect(changedFields({ a: 1 }, { a: 1 })).toBeNull();
  });

  it("null → qiymat o'zgarishini ushlaydi", () => {
    expect(changedFields({ notes: null }, { notes: "yangi" })).toEqual({
      notes: { from: null, to: "yangi" },
    });
  });
});
