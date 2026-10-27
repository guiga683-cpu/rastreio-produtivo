import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { recoveryEmailSchema } from "@/lib/password-recovery";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [
    { title: "Esqueci minha senha — Embarques" },
    { name: "description", content: "Solicite um link para recuperar sua senha de acesso ao Embarques." },
    { property: "og:title", content: "Esqueci minha senha — Embarques" },
    { property: "og:description", content: "Recupere sua senha de acesso ao Embarques por e-mail." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof recoveryEmailSchema>>({
    resolver: zodResolver(recoveryEmailSchema), defaultValues: { email: "" },
  });

  async function submit({ email }: z.infer<typeof recoveryEmailSchema>) {
    setError(null);
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/atualizar-senha",
      });
      if (requestError) {
        // Never reveal account existence through provider error messages.
        if (requestError.code === "user_not_found" || requestError.status === 404) {
          setSent(true);
          return;
        }
        setError("Não foi possível enviar a solicitação agora. Aguarde alguns minutos e tente novamente.");
        return;
      }
      setSent(true);
    } catch {
      setError("Não foi possível enviar a solicitação. Verifique sua conexão e tente novamente.");
    }
  }

  return (
    <AuthCard title="Esqueci minha senha" description="Informe seu e-mail para receber um link de redefinição.">
      {sent ? <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">
        Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha.
      </p> : <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-3">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel className="text-xs">E-mail</FormLabel>
              <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          {error && <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Enviando…" : "Enviar link"}
          </Button>
        </form>
      </Form>}
      <Button asChild variant="link" className="mt-4 h-auto w-full p-0 text-xs font-normal text-muted-foreground hover:text-foreground">
        <Link to="/auth">Voltar ao login</Link>
      </Button>
    </AuthCard>
  );
}