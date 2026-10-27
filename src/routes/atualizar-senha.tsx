import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { newPasswordSchema, recoveryLinkState } from "@/lib/password-recovery";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const Route = createFileRoute("/atualizar-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Embarques" },
      { name: "description", content: "Defina uma nova senha para sua conta no Embarques." },
      { property: "og:title", content: "Redefinir senha — Embarques" },
      {
        property: "og:description",
        content: "Redefina sua senha com um link de recuperação válido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpdatePasswordPage,
});

const recoveryKey = "embarques-password-recovery-user";

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let active = true;
    let recovered = false;
    const link = recoveryLinkState(window.location.hash, window.location.search);
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && !link.invalid) {
        recovered = true;
        sessionStorage.setItem(recoveryKey, session.user.id);
        if (active) setState("ready");
      }
    });
    // getUser waits for URL processing and validates the recovered session remotely.
    void supabase.auth
      .getUser()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        const remembered = data.user && sessionStorage.getItem(recoveryKey) === data.user.id;
        if (
          link.invalid ||
          sessionError ||
          !data.user ||
          !(recovered || remembered)
        ) {
          sessionStorage.removeItem(recoveryKey);
          setState("invalid");
          return;
        }
        sessionStorage.setItem(recoveryKey, data.user.id);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("invalid");
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit({ password }: z.infer<typeof newPasswordSchema>) {
    if (state !== "ready") return;
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        if (
          [
            "session_not_found",
            "refresh_token_not_found",
            "refresh_token_already_used",
            "otp_expired",
          ].includes(updateError.code ?? "") ||
          updateError.status === 401 ||
          updateError.status === 403
        ) {
          sessionStorage.removeItem(recoveryKey);
          setState("invalid");
        } else {
          setError(
            updateError.code === "same_password"
              ? "Escolha uma senha diferente da senha atual."
              : "Não foi possível atualizar a senha. Tente outra senha ou solicite um novo link.",
          );
        }
        return;
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) {
        setError(
          "Sua senha foi atualizada, mas não foi possível encerrar a sessão. Recarregue a página para entrar novamente.",
        );
        return;
      }
      sessionStorage.removeItem(recoveryKey);
      await navigate({ to: "/auth", search: { senhaAtualizada: true }, replace: true });
    } catch {
      setError("Não foi possível concluir a operação. Verifique sua conexão e tente novamente.");
    }
  }

  return (
    <AuthCard title="Redefinir senha" description="Escolha uma nova senha para sua conta.">
      {state === "checking" ? (
        <p role="status" className="text-xs text-muted-foreground">
          Verificando link…
        </p>
      ) : state === "invalid" ? (
        <>
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            Este link é inválido ou expirou. Solicite um novo link para redefinir sua senha.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link to="/esqueci-senha">Solicitar novo link</Link>
          </Button>
        </>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-3">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Confirmar nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </form>
        </Form>
      )}
      <Button
        asChild
        variant="link"
        className="mt-4 h-auto w-full p-0 text-xs font-normal text-muted-foreground hover:text-foreground"
      >
        <Link to="/auth">Voltar ao login</Link>
      </Button>
    </AuthCard>
  );
}
