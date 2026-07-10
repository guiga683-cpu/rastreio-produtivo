import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Carga, Equipment, Project } from "@/lib/embarques";
import { isLate, isNext10, isNext30, isTipoMaterial } from "@/lib/embarques";
import { EquipTable } from "@/components/equip-table";
import { useEffect, useState, type ComponentProps } from "react";
import { seedExampleIfEmpty } from "@/lib/seed";

type Next30Row = Equipment & { project?: Project };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Embarques" }] }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const [janela, setJanela] = useState<"10" | "30">("30");
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["all-data"],
    queryFn: async () => {
      const [pRes, eRes, cRes] = await Promise.all([
        supabase.from("projects").select("id,name,client").order("created_at"),
        supabase.from("equipments").select("*").order("created_at"),
        supabase.from("cargas").select("*").order("created_at"),
      ]);
      if (pRes.error) throw pRes.error;
      if (eRes.error) throw eRes.error;
      if (cRes.error) throw cRes.error;
      return {
        projects: (pRes.data ?? []) as Project[],
        equipments: (eRes.data ?? []) as Equipment[],
        cargas: (cRes.data ?? []) as Carga[],
      };
    },
  });

  useEffect(() => {
    if (data && data.projects.length === 0) {
      seedExampleIfEmpty().then(() => refetch());
    }
  }, [data, refetch]);

  const projects = data?.projects ?? [];
  const equipments = data?.equipments ?? [];
  const cargas = data?.cargas ?? [];
  const pById = new Map(projects.map((p) => [p.id, p]));
  const enriched = equipments.map((e) => ({ ...e, project: pById.get(e.project_id) }));

  const cargasByEquipment = new Map<string, Carga[]>();
  for (const c of cargas) {
    const list = cargasByEquipment.get(c.equipment_id) ?? [];
    list.push(c);
    cargasByEquipment.set(c.equipment_id, list);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["all-data"] });
  }

  async function syncValorUnitario(equipmentId: string, updatedCargas: Carga[]) {
    const total = updatedCargas.reduce((s, c) => s + Number(c.valor || 0), 0);
    const { error } = await supabase
      .from("equipments")
      .update({ valor_unitario: total })
      .eq("id", equipmentId);
    if (error) throw error;
  }

  async function handleAddCarga(equipmentId: string) {
    const { data: inserted, error } = await supabase
      .from("cargas")
      .insert({ equipment_id: equipmentId, descricao: "Carga", valor: 0 })
      .select()
      .single();
    if (error) return alert(error.message);
    const updated = [...(cargasByEquipment.get(equipmentId) ?? []), inserted as Carga];
    await syncValorUnitario(equipmentId, updated);
    invalidate();
  }

  async function handleUpdateCarga(id: string, patch: Partial<Carga>) {
    const carga = cargas.find((c) => c.id === id);
    if (!carga) return;
    const { error } = await supabase.from("cargas").update(patch).eq("id", id);
    if (error) return alert(error.message);
    const updated = (cargasByEquipment.get(carga.equipment_id) ?? []).map((c) =>
      c.id === id ? { ...c, ...patch } : c,
    );
    await syncValorUnitario(carga.equipment_id, updated);
    invalidate();
  }

  async function handleDeleteCarga(id: string) {
    const carga = cargas.find((c) => c.id === id);
    if (!carga) return;
    const { error } = await supabase.from("cargas").delete().eq("id", id);
    if (error) return alert(error.message);
    const updated = (cargasByEquipment.get(carga.equipment_id) ?? []).filter((c) => c.id !== id);
    await syncValorUnitario(carga.equipment_id, updated);
    invalidate();
  }

  async function handleUpdateStatusField(
    equipmentId: string,
    field: "romaneio" | "painel" | "custo" | "fluxo",
    value: "OK" | "NOK",
  ) {
    const { error } = await supabase
      .from("equipments")
      .update({ [field]: value })
      .eq("id", equipmentId);
    if (error) return alert(error.message);
    invalidate();
  }

  async function handleUpdateObs(equipmentId: string, value: string | null) {
    const { error } = await supabase
      .from("equipments")
      .update({ observacao: value })
      .eq("id", equipmentId);
    if (error) return alert(error.message);
    invalidate();
  }

  async function handleUpdateNota(equipmentId: string, value: string | null) {
    const { error } = await supabase
      .from("equipments")
      .update({ nota: value })
      .eq("id", equipmentId);
    if (error) return alert(error.message);
    invalidate();
  }

  const equipEnriched = enriched.filter((e) => e.tipo === "Equipamento");
  const matEnriched = enriched.filter((e) => isTipoMaterial(e.tipo));

  const next10Equip = equipEnriched.filter((e) => isNext10(e));
  const next10Mat = matEnriched.filter((e) => isNext10(e));
  const next30Equip = equipEnriched.filter((e) => isNext30(e));
  const next30Mat = matEnriched.filter((e) => isNext30(e));

  const rows10Mat = [...matEnriched.filter((e) => isLate(e)), ...next10Mat];
  const rows10Equip = [...equipEnriched.filter((e) => isLate(e)), ...next10Equip];
  const rows30Mat = [...matEnriched.filter((e) => isLate(e)), ...next30Mat];
  const rows30Equip = [...equipEnriched.filter((e) => isLate(e)), ...next30Equip];
  const count10 = Array.from(
    new Map([...rows10Mat, ...rows10Equip].map((r) => [r.id, r])).values(),
  ).length;
  const count30 = Array.from(
    new Map([...rows30Mat, ...rows30Equip].map((r) => [r.id, r])).values(),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos embarques.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <JanelaCard
          label="Próximos 10 dias"
          count={count10}
          active={janela === "10"}
          onClick={() => setJanela("10")}
        />
        <JanelaCard
          label="Próximos 30 dias"
          count={count30}
          active={janela === "30"}
          onClick={() => setJanela("30")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">Legenda:</span>
        <LegendDot color="bg-row-late" label="Atrasado" />
        <LegendDot color="bg-row-today" label="Embarque hoje" />
        <LegendDot color="bg-card border" label="Dentro do prazo" />
      </div>

      {janela === "10" ? (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Materiais — Próximos 10 dias
            </h2>
            <Next30Section
              rows={rows10Mat}
              isLoading={isLoading}
              empty="Nada nos próximos 10 dias."
              hiddenColumns={[
                "posicao",
                "data_producao",
                "status_producao",
                "peso",
                "volume",
                "veiculo",
                "status_embarque",
              ]}
              cargasByEquipment={cargasByEquipment}
              onAddCarga={handleAddCarga}
              onUpdateCarga={handleUpdateCarga}
              onDeleteCarga={handleDeleteCarga}
              editableStatusFields
              onUpdateStatusField={handleUpdateStatusField}
              editableObs
              onUpdateObs={handleUpdateObs}
              editableNota
              onUpdateNota={handleUpdateNota}
              defaultSort={{ key: "data_embarque", direction: "asc" }}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Equipamentos — Próximos 10 dias
            </h2>
            <Next30Section
              rows={rows10Equip}
              isLoading={isLoading}
              empty="Nada nos próximos 10 dias."
              hiddenColumns={[
                "peso",
                "volume",
                "veiculo",
                "status_producao",
                "status_embarque",
                "custo",
              ]}
              cargasByEquipment={cargasByEquipment}
              onAddCarga={handleAddCarga}
              onUpdateCarga={handleUpdateCarga}
              onDeleteCarga={handleDeleteCarga}
              editableStatusFields
              onUpdateStatusField={handleUpdateStatusField}
              editableObs
              onUpdateObs={handleUpdateObs}
              editableNota
              onUpdateNota={handleUpdateNota}
              defaultSort={{ key: "data_embarque", direction: "asc" }}
            />
          </section>
        </>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Materiais — Próximos 30 dias (inclui atrasados)
            </h2>
            <Next30Section
              rows={rows30Mat}
              isLoading={isLoading}
              empty="Nada nos próximos 30 dias."
              hiddenColumns={[
                "posicao",
                "data_producao",
                "status_producao",
                "peso",
                "volume",
                "veiculo",
                "status_embarque",
              ]}
              cargasByEquipment={cargasByEquipment}
              onAddCarga={handleAddCarga}
              onUpdateCarga={handleUpdateCarga}
              onDeleteCarga={handleDeleteCarga}
              editableStatusFields
              onUpdateStatusField={handleUpdateStatusField}
              editableObs
              onUpdateObs={handleUpdateObs}
              editableNota
              onUpdateNota={handleUpdateNota}
              defaultSort={{ key: "data_embarque", direction: "asc" }}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Equipamentos — Próximos 30 dias (inclui atrasados)
            </h2>
            <Next30Section
              rows={rows30Equip}
              isLoading={isLoading}
              empty="Nada nos próximos 30 dias."
              hiddenColumns={[
                "peso",
                "volume",
                "veiculo",
                "status_producao",
                "status_embarque",
                "custo",
              ]}
              cargasByEquipment={cargasByEquipment}
              onAddCarga={handleAddCarga}
              onUpdateCarga={handleUpdateCarga}
              onDeleteCarga={handleDeleteCarga}
              editableStatusFields
              onUpdateStatusField={handleUpdateStatusField}
              editableObs
              onUpdateObs={handleUpdateObs}
              editableNota
              onUpdateNota={handleUpdateNota}
              defaultSort={{ key: "data_embarque", direction: "asc" }}
            />
          </section>
        </>
      )}
    </div>
  );
}

function Next30Section({
  rows,
  isLoading,
  empty,
  hiddenColumns,
  cargasByEquipment,
  onAddCarga,
  onUpdateCarga,
  onDeleteCarga,
  editableStatusFields,
  onUpdateStatusField,
  editableObs,
  onUpdateObs,
  editableNota,
  onUpdateNota,
  defaultSort,
}: {
  rows: Next30Row[];
  isLoading: boolean;
  empty?: string;
  hiddenColumns?: ComponentProps<typeof EquipTable>["hiddenColumns"];
  cargasByEquipment?: ComponentProps<typeof EquipTable>["cargasByEquipment"];
  onAddCarga?: ComponentProps<typeof EquipTable>["onAddCarga"];
  onUpdateCarga?: ComponentProps<typeof EquipTable>["onUpdateCarga"];
  onDeleteCarga?: ComponentProps<typeof EquipTable>["onDeleteCarga"];
  editableStatusFields?: ComponentProps<typeof EquipTable>["editableStatusFields"];
  onUpdateStatusField?: ComponentProps<typeof EquipTable>["onUpdateStatusField"];
  editableObs?: ComponentProps<typeof EquipTable>["editableObs"];
  onUpdateObs?: ComponentProps<typeof EquipTable>["onUpdateObs"];
  editableNota?: ComponentProps<typeof EquipTable>["editableNota"];
  onUpdateNota?: ComponentProps<typeof EquipTable>["onUpdateNota"];
  defaultSort?: ComponentProps<typeof EquipTable>["defaultSort"];
}) {
  const dedup = Array.from(new Map(rows.map((r) => [r.id, r])).values());
  return (
    <EquipTable
      rows={dedup}
      empty={isLoading ? "Carregando…" : (empty ?? "Sem itens.")}
      stickyHeader
      maxHeight="520px"
      hiddenColumns={hiddenColumns}
      editableCargas
      cargasByEquipment={cargasByEquipment}
      onAddCarga={onAddCarga}
      onUpdateCarga={onUpdateCarga}
      onDeleteCarga={onDeleteCarga}
      editableStatusFields={editableStatusFields}
      onUpdateStatusField={onUpdateStatusField}
      editableObs={editableObs}
      onUpdateObs={onUpdateObs}
      editableNota={editableNota}
      onUpdateNota={onUpdateNota}
      defaultSort={defaultSort}
    />
  );
}

function JanelaCard({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-left shadow-sm transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/40"}`}
    >
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{count}</div>
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${color}`} />
      {label}
    </span>
  );
}
