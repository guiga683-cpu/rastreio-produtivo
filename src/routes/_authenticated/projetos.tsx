import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Pencil, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Equipment, Project } from "@/lib/embarques";
import { isLate, isNext30 } from "@/lib/embarques";
import { EquipTable } from "@/components/equip-table";
import { EquipEditor, emptyRow, type DraftEquip } from "@/components/equip-editor";

type ProjEquipRow = Equipment & { project: Project };

export const Route = createFileRoute("/_authenticated/projetos")({
  head: () => ({ meta: [{ title: "Projetos — Embarques" }] }),
  component: ProjetosPage,
});

interface FullProject extends Project {
  equipments: Equipment[];
}

function ProjetosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["projetos-full"],
    queryFn: async () => {
      const [pRes, eRes] = await Promise.all([
        supabase.from("projects").select("id,name,client").order("created_at"),
        supabase.from("equipments").select("*").order("created_at"),
      ]);
      if (pRes.error) throw pRes.error;
      if (eRes.error) throw eRes.error;
      const equipments = (eRes.data ?? []) as Equipment[];
      const projects = (pRes.data ?? []) as Project[];
      return projects.map<FullProject>((p) => ({
        ...p,
        equipments: equipments.filter((e) => e.project_id === p.id),
      }));
    },
  });

  const projects = data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Projetos</h1>
        <p className="text-sm text-muted-foreground">
          Clique em um projeto para ver e editar seus equipamentos.
        </p>
      </div>
      {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {!isLoading && projects.length === 0 && (
        <div className="rounded-md border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Nenhum projeto ainda. Crie um na aba "Novo projeto".
        </div>
      )}
      <div className="space-y-3">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            onChanged={() => qc.invalidateQueries({ queryKey: ["projetos-full"] })}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, onChanged }: { project: FullProject; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.client);
  const [rows, setRows] = useState<DraftEquip[]>(() => project.equipments.map(toDraft));
  const [saving, setSaving] = useState(false);

  const total = project.equipments.length;
  const late = project.equipments.filter((e) => isLate(e)).length;
  const next = project.equipments.filter((e) => isNext30(e)).length;
  const exp = project.equipments.filter((e) => e.status_embarque === "Expedido").length;

  async function remove() {
    if (!confirm(`Excluir projeto "${project.name}"?`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) alert(error.message);
    else onChanged();
  }

  function startEdit() {
    setName(project.name);
    setClient(project.client);
    setRows(project.equipments.map(toDraft));
    setEditing(true);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada.");
      const { error: pErr } = await supabase
        .from("projects")
        .update({ name, client })
        .eq("id", project.id);
      if (pErr) throw pErr;

      const keepIds = rows.filter((r) => r.id).map((r) => r.id!);
      const toDelete = project.equipments.filter((e) => !keepIds.includes(e.id)).map((e) => e.id);
      if (toDelete.length > 0) {
        const { error } = await supabase.from("equipments").delete().in("id", toDelete);
        if (error) throw error;
      }

      for (const r of rows) {
        const payload = {
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
          peso: null,
          volume: null,
          observacao: r.observacao,
          nota: r.nota,
          veiculo: null,
        };
        if (r.id) {
          const { error } = await supabase.from("equipments").update(payload).eq("id", r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("equipments")
            .insert({ ...payload, project_id: project.id, user_id: u.user.id });
          if (error) throw error;
        }
      }
      setEditing(false);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const enriched = project.equipments.map((e) => ({ ...e, project }));

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              open ? "rotate-0" : "-rotate-90"
            }`}
          />
          <div>
            <div className="text-sm font-semibold">{project.name}</div>
            <div className="text-xs text-muted-foreground">{project.client}</div>
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="pill bg-muted text-muted-foreground">{total} equip.</span>
          {late > 0 && <span className="pill bg-danger/15 text-danger">{late} atrasados</span>}
          {next > 0 && (
            <span className="pill bg-warning/20 text-warning-foreground">{next} prox. 30d</span>
          )}
          {exp > 0 && <span className="pill bg-success/15 text-success">{exp} expedidos</span>}
        </div>
        <div className="flex items-center gap-1">
          {!editing && (
            <>
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
              >
                <Pencil className="h-3 w-3" /> Editar
              </button>
              <button
                onClick={remove}
                className="inline-flex items-center gap-1 rounded-md border border-danger/30 px-2 py-1 text-xs text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t bg-background/30 p-4">
          {editing ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">Projeto</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Cliente</label>
                  <input
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <EquipEditor rows={rows} onChange={setRows} />
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" /> {saving ? "Salvando…" : "Salvar"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setRows(project.equipments.map(toDraft));
                  }}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
                <button
                  onClick={() => setRows((r) => [...r, emptyRow()])}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  + Nova linha
                </button>
              </div>
            </div>
          ) : (
            <SortedEquipList rows={enriched} />
          )}
        </div>
      )}
    </div>
  );
}

function SortedEquipList({ rows }: { rows: ProjEquipRow[] }) {
  return (
    <EquipTable
      rows={rows}
      showProject={false}
      empty="Projeto sem equipamentos."
      stickyHeader
      maxHeight="600px"
      hiddenColumns={["peso", "volume", "veiculo"]}
    />
  );
}

function toDraft(e: Equipment): DraftEquip {
  return {
    id: e.id,
    equipamento: e.equipamento,
    posicao: e.posicao ?? null,
    valor_unitario: Number(e.valor_unitario),
    quantidade: e.quantidade,
    data_producao: e.data_producao,
    status_producao: e.status_producao,
    data_embarque: e.data_embarque,
    status_embarque: e.status_embarque,
    tipo: (e.tipo ?? "Equipamento") as DraftEquip["tipo"],
    data_faturamento: e.data_faturamento ?? null,
    frete: e.frete ?? null,
    peso: e.peso ?? null,
    volume: e.volume ?? null,
    observacao: e.observacao ?? null,
    nota: e.nota ?? null,
    veiculo: e.veiculo ?? null,
    romaneio: e.romaneio ?? "NOK",
    painel: e.painel ?? "NOK",
    custo: e.custo ?? "NOK",
    fluxo: e.fluxo ?? "NOK",
  };
}
