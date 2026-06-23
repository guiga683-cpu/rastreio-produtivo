import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Embarques" }] }),
  beforeLoad: ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(context as any).isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

type Profile = {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function AdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const [pRes, rRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,email,status,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (pRes.error) throw pRes.error;
      if (rRes.error) throw rRes.error;
      const adminIds = new Set(
        (rRes.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
      );
      return {
        profiles: (pRes.data ?? []) as Profile[],
        adminIds,
      };
    },
  });

  async function setStatus(id: string, status: Profile["status"]) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) alert(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  }

  async function toggleAdmin(id: string, isAdmin: boolean) {
    if (isAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id)
        .eq("role", "admin");
      if (error) alert(error.message);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: id, role: "admin" });
      if (error) alert(error.message);
    }
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  }

  const profiles = data?.profiles ?? [];
  const adminIds = data?.adminIds ?? new Set<string>();
  const pending = profiles.filter((p) => p.status === "pending");
  const others = profiles.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Administração de usuários</h1>
        <p className="text-sm text-muted-foreground">
          Aprove novos cadastros e gerencie permissões. Todos os usuários aprovados
          compartilham a mesma base de dados.
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Aguardando aprovação ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Nenhum cadastro pendente.
          </div>
        ) : (
          <UserTable rows={pending} adminIds={adminIds} setStatus={setStatus} toggleAdmin={toggleAdmin} showApproveActions />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Usuários ({others.length})
        </h2>
        <UserTable rows={others} adminIds={adminIds} setStatus={setStatus} toggleAdmin={toggleAdmin} />
      </section>
    </div>
  );
}

function UserTable({
  rows,
  adminIds,
  setStatus,
  toggleAdmin,
  showApproveActions = false,
}: {
  rows: Profile[];
  adminIds: Set<string>;
  setStatus: (id: string, s: Profile["status"]) => void;
  toggleAdmin: (id: string, isAdmin: boolean) => void;
  showApproveActions?: boolean;
}) {
  if (rows.length === 0)
    return (
      <div className="rounded-md border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Nenhum usuário.
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium">E-mail</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Papel</th>
            <th className="px-3 py-2 font-medium">Cadastro</th>
            <th className="px-3 py-2 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const isAdmin = adminIds.has(u.id);
            return (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2 font-medium">{u.email}</td>
                <td className="px-3 py-2">
                  <StatusPill status={u.status} />
                </td>
                <td className="px-3 py-2">
                  {isAdmin ? (
                    <span className="pill bg-primary/15 text-primary inline-flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </span>
                  ) : (
                    <span className="pill bg-muted text-muted-foreground">Usuário</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    {(showApproveActions || u.status !== "approved") && (
                      <button
                        onClick={() => setStatus(u.id, "approved")}
                        className="inline-flex items-center gap-1 rounded-md border border-success/30 px-2 py-1 text-xs text-success hover:bg-success/10"
                      >
                        <Check className="h-3 w-3" /> Aprovar
                      </button>
                    )}
                    {u.status !== "rejected" && (
                      <button
                        onClick={() => setStatus(u.id, "rejected")}
                        className="inline-flex items-center gap-1 rounded-md border border-danger/30 px-2 py-1 text-xs text-danger hover:bg-danger/10"
                      >
                        <X className="h-3 w-3" /> Rejeitar
                      </button>
                    )}
                    {u.status === "approved" && (
                      <button
                        onClick={() => toggleAdmin(u.id, isAdmin)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                      >
                        {isAdmin ? "Remover admin" : "Tornar admin"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: Profile["status"] }) {
  const map: Record<Profile["status"], string> = {
    pending: "bg-warning/20 text-warning-foreground",
    approved: "bg-success/15 text-success",
    rejected: "bg-danger/15 text-danger",
  };
  const label: Record<Profile["status"], string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
  };
  return <span className={`pill ${map[status]}`}>{label[status]}</span>;
}
