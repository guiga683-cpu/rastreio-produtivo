import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/")({
  head: () => ({ meta: [{ title: "Entrar — Embarques" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (prof?.status === "approved") {
        navigate({ to: "/dashboard", replace: true });
      }
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setInfo(
          "Cadastro recebido. Sua conta precisa ser aprovada por um administrador antes do primeiro acesso.",
        );
        setMode("login");
        setPassword("");
        return;
      }

      const { data: signIn, error: sErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (sErr) throw sErr;

      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", signIn.user.id)
        .maybeSingle();
      if (pErr) throw pErr;

      if (!prof || prof.status === "pending") {
        await supabase.auth.signOut();
        setError("Sua conta ainda não foi aprovada pelo administrador.");
        return;
      }
      if (prof.status === "rejected") {
        await supabase.auth.signOut();
        setError("Seu acesso foi rejeitado. Entre em contato com o administrador.");
        return;
      }

      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="mb-1 text-lg font-semibold">
        {mode === "login" ? "Entrar" : "Solicitar acesso"}
      </h1>
      <p className="mb-4 text-xs text-muted-foreground">
        {mode === "login"
          ? "Acompanhe prazos de embarque por projeto."
          : "Novas contas precisam ser aprovadas por um administrador."}
      </p>
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
        <div>
          <label className="mb-1 block text-xs font-medium">Senha</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        {error && (
          <div className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
        )}
        {info && (
          <div className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">{info}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Solicitar acesso"}
        </button>
      </form>
      {mode === "login" && (
        <div className="mt-3 text-center">
          <Link
            to="/auth/esqueci-senha"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Esqueci minha senha
          </Link>
        </div>
      )}
      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
          setInfo(null);
        }}
        className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "login" ? "Não tem conta? Solicitar acesso" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}
