import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { newPasswordSchema, recoveryEmailSchema, recoveryLinkState } from "./password-recovery";

describe("Recuperação de senha", () => {
  test("exige pelo menos 8 caracteres", () => {
    assert.equal(
      newPasswordSchema.safeParse({ password: "1234567", confirmPassword: "1234567" }).success,
      false,
    );
    assert.equal(
      newPasswordSchema.safeParse({ password: "12345678", confirmPassword: "12345678" }).success,
      true,
    );
  });
  test("exige confirmação igual", () => {
    assert.equal(
      newPasswordSchema.safeParse({ password: "abcdefgh", confirmPassword: "abcdefgi" }).success,
      false,
    );
  });
  test("valida o e-mail", () => {
    assert.equal(recoveryEmailSchema.safeParse({ email: "invalido" }).success, false);
    assert.equal(recoveryEmailSchema.parse({ email: " pessoa@example.com " }).email,
      "pessoa@example.com",
    );
  });
  test("identifica recuperação e links expirados sem aceitar uma sessão comum", () => {
    assert.equal(recoveryLinkState("#type=recovery", "").recovery, true);
    assert.equal(recoveryLinkState("#type=signup", "").recovery, false);
    assert.equal(recoveryLinkState("#error_code=otp_expired", "").invalid, true);
    assert.equal(recoveryLinkState("", "?error=access_denied").invalid, true);
  });
});
