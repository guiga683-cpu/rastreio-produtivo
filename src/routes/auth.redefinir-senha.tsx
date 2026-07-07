import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/redefinir-senha")({
  head: () => ({ meta: [{ title: "Redefinir senha — Embarques" }] }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    // O Supabase cria uma sessão do tipo recovery ao clicar no link.
    // Escutamos o evento PASSWORD_RECOVERY e também checamos a sessão atual.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setInvalid(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setReady(true);
      } else {
        // Aguarda um pouco caso o link ainda esteja processando o hash
        setTimeout(() => {
          if (!mounted) return;
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (!mounted) return;
            if (!d2.session) setInvalid(true);
          });
        }, 1200);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      // Encerra a sessão de recovery e volta ao login após alguns segundos
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  if (invalid) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">Link inválido ou expirado</h1>
        <p className="mb-4 text-xs text-muted-foreground">
          O link de recuperação não é mais válido. Solicite um novo link para continuar.
        </p>
        <Link
          to="/auth/esqueci-senha"
          className="block w-full rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Pedir novo link
        </Link>
        <Link
          to="/auth"
          className="mt-2 block w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Voltar para login
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">Senha redefinida</h1>
        <div className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">
          Sua senha foi atualizada com sucesso. Redirecionando para o login…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="mb-1 text-lg font-semibold">Redefinir senha</h1>
      <p className="mb-4 text-xs text-muted-foreground">Defina uma nova senha para sua conta.</p>
      {!ready ? (
        <div className="text-xs text-muted-foreground">Validando link…</div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Nova senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Confirmar nova senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {loading ? "Salvando…" : "Redefinir senha"}
          </button>
        </form>
      )}
    </div>
  );
}
