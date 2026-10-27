import { z } from "zod";

export const recoveryEmailSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas devem ser iguais.",
    path: ["confirmPassword"],
  });

export function recoveryLinkState(hash: string, search: string) {
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search);
  return {
    invalid: [fragment, query].some((params) => params.has("error") || params.has("error_code")),
    recovery: fragment.get("type") === "recovery",
  };
}
