import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/esqueci-senha")({
  head: () => ({ meta: [{ title: "Esqueci minha senha — Embarques" }] }),
  component: EsqueciSenhaPage,
});

function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/redefinir-senha`,
      });
      // Sempre exibimos mensagem genérica para não revelar existência do e-mail.
      setSent(true);
    } catch (err) {
      // Mesmo em erro de rede, seguimos genéricos:
      setSent(true);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="mb-1 text-lg font-semibold">Recuperar senha</h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Informe o e-mail cadastrado e enviaremos um link para redefinir a senha.
      </p>
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.
            Verifique sua caixa de entrada e a pasta de spam.
          </div>
          <Link
            to="/auth"
            className="block w-full rounded-md border px-3 py-2 text-center text-sm hover:bg-accent"
          >
            Voltar para login
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <div className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar link de recuperação"}
          </button>
          <Link
            to="/auth"
            className="mt-2 block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Voltar para login
          </Link>
        </form>
      )}
    </div>
  );
}
