import { describe, it, expect } from "vitest";
import { generateSecret, generateToken, verifyToken, keyUri } from "./mfa";

describe("TOTP MFA (RFC 6238)", () => {
  it("yaratilgan sir base32 formatida", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it("joriy token tasdiqlanadi", () => {
    const secret = generateSecret();
    const token = generateToken(secret);
    expect(verifyToken(token, secret)).toBe(true);
  });

  it("noto'g'ri token rad etiladi", () => {
    const secret = generateSecret();
    expect(verifyToken("000000", secret)).toBe(verifyToken("000000", secret));
    const token = generateToken(secret);
    const wrong = token === "123456" ? "654321" : "123456";
    expect(verifyToken(wrong, secret)).toBe(false);
  });

  it("oldingi oyna (30s) ichidagi token qabul qilinadi, eskisi rad etiladi", () => {
    const secret = generateSecret();
    const prev = generateToken(secret, Date.now() - 30_000);
    expect(verifyToken(prev, secret)).toBe(true);
    const old = generateToken(secret, Date.now() - 5 * 60_000);
    expect(verifyToken(old, secret)).toBe(false);
  });

  it("keyUri otpauth formatida", () => {
    const uri = keyUri("user@shodflow.com", "ABCDEFGHIJKLMNOP");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=ABCDEFGHIJKLMNOP");
  });
});
