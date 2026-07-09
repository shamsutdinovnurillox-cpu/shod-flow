import { describe, it, expect } from "vitest";
import { toUserMessage, requireField, ValidationError, AuthError } from "./errors";

describe("toUserMessage", () => {
  it("AuthError xabari o'zgarishsiz qaytadi", () => {
    expect(toUserMessage(new AuthError("Bu modulga ruxsatingiz yo'q."))).toBe("Bu modulga ruxsatingiz yo'q.");
  });

  it("ValidationError xabari o'zgarishsiz qaytadi", () => {
    expect(toUserMessage(new ValidationError("Narx noto'g'ri."))).toBe("Narx noto'g'ri.");
  });

  it("oddiy Error xabarini qaytaradi", () => {
    expect(toUserMessage(new Error("Nimadir buzildi"))).toBe("Nimadir buzildi");
  });

  it("noma'lum qiymat uchun umumiy xabar", () => {
    expect(toUserMessage(undefined)).toMatch(/Kutilmagan xatolik/);
    expect(toUserMessage("string")).toMatch(/Kutilmagan xatolik/);
  });
});

describe("requireField", () => {
  it("bo'sh string uchun ValidationError tashlaydi", () => {
    expect(() => requireField("", "Unit")).toThrow(ValidationError);
    expect(() => requireField("   ", "Unit")).toThrow(/"Unit" majburiy maydon/);
  });

  it("null/undefined uchun tashlaydi", () => {
    expect(() => requireField(null, "VIN")).toThrow(ValidationError);
    expect(() => requireField(undefined, "VIN")).toThrow(ValidationError);
  });

  it("to'ldirilgan qiymatni qaytaradi", () => {
    expect(requireField("T-101", "Unit")).toBe("T-101");
    expect(requireField(0, "Raqam")).toBe(0);
  });
});
