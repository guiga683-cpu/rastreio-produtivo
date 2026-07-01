import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isTipoMaterial } from "@/lib/embarques";
import { emptyRow, EquipEditor, type DraftEquip } from "@/components/equip-editor";

export const Route = createFileRoute("/_authenticated/novo")({
  head: () => ({ meta: [{ title: "Novo projeto — Embarques" }] }),
  component: NovoProjeto,
});

function NovoProjeto() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [rows, setRows] = useState<DraftEquip[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada.");
      const { data: project, error: pErr } = await supabase
        .from("projects")
        .insert({ name, client, user_id: u.user.id })
        .select()
        .single();
      if (pErr) throw pErr;
      if (rows.length > 0) {
        const { error: eErr } = await supabase.from("equipments").insert(
          rows.map((r) => ({
            project_id: project.id,
            user_id: u.user!.id,
            equipamento: r.equipamento,
            posicao: r.tipo === "Material TRT" ? null : r.posicao,
            valor_unitario: r.valor_unitario,
            quantidade: r.quantidade,
            data_producao: r.tipo === "Material TRT" ? null : r.data_producao,
            status_producao: r.tipo === "Material TRT" ? null : r.status_producao,
            data_embarque: r.data_embarque,
            status_embarque: r.status_embarque,
            tipo: r.tipo,
            data_faturamento: r.data_faturamento,
            frete: r.frete,
            peso: isTipoMaterial(r.tipo) ? r.peso : null,
            volume: isTipoMaterial(r.tipo) ? r.volume : null,
            observacao: isTipoMaterial(r.tipo) ? r.observacao : null,
            veiculo: r.tipo === "Material TRT" ? r.veiculo : null,
          })),
        );
        if (eErr) throw eErr;
      }
      navigate({ to: "/projetos" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Novo projeto</h1>
        <p className="text-sm text-muted-foreground">Cadastre um projeto e seus equipamentos.</p>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Nome do projeto</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: B5000572"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Cliente</label>
          <input
            required
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Ex: Kamesq"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Equipamentos</h2>
        <EquipEditor rows={rows} onChange={setRows} />
      </div>

      {error && (
        <div className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar projeto"}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/projetos" })}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
