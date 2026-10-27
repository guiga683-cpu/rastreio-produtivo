import { describe, expect, test } from "bun:test";
import { newPasswordSchema, recoveryEmailSchema, recoveryLinkState } from "./password-recovery";

describe("Recuperação de senha", () => {
  test("exige pelo menos 8 caracteres", () => {
    expect(
      newPasswordSchema.safeParse({ password: "1234567", confirmPassword: "1234567" }).success,
    ).toBe(false);
    expect(
      newPasswordSchema.safeParse({ password: "12345678", confirmPassword: "12345678" }).success,
    ).toBe(true);
  });
  test("exige confirmação igual", () => {
    expect(
      newPasswordSchema.safeParse({ password: "abcdefgh", confirmPassword: "abcdefgi" }).success,
    ).toBe(false);
  });
  test("valida o e-mail", () => {
    expect(recoveryEmailSchema.safeParse({ email: "invalido" }).success).toBe(false);
    expect(recoveryEmailSchema.parse({ email: " pessoa@example.com " }).email).toBe(
      "pessoa@example.com",
    );
  });
  test("identifica recuperação e links expirados sem aceitar uma sessão comum", () => {
    expect(recoveryLinkState("#type=recovery", "").recovery).toBe(true);
    expect(recoveryLinkState("#type=signup", "").recovery).toBe(false);
    expect(recoveryLinkState("#error_code=otp_expired", "").invalid).toBe(true);
    expect(recoveryLinkState("", "?error=access_denied").invalid).toBe(true);
  });
});
