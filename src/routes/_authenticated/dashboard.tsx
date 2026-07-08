import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Carga, Equipment, Project } from "@/lib/embarques";
import { isLate, isNext30, isTipoMaterial } from "@/lib/embarques";
import { EquipTable } from "@/components/equip-table";
import { AlertTriangle, CalendarClock, FolderKanban, Boxes, Package } from "lucide-react";
import { useEffect, type ComponentProps } from "react";
import { seedExampleIfEmpty } from "@/lib/seed";

type Next30Row = Equipment & { project?: Project };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Embarques" }] }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
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

  const equipEnriched = enriched.filter((e) => e.tipo === "Equipamento");
  const matEnriched = enriched.filter((e) => isTipoMaterial(e.tipo));

  const lateEquip = equipEnriched.filter((e) => isLate(e));
  const lateMat = matEnriched.filter((e) => isLate(e));
  const next30Equip = equipEnriched.filter((e) => isNext30(e));
  const next30Mat = matEnriched.filter((e) => isNext30(e));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos embarques.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Atrasados"
          value={lateEquip.length + lateMat.length}
          tone="danger"
        />
        <MetricCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Próximos 30 dias"
          value={next30Equip.length + next30Mat.length}
          tone="warning"
        />
        <MetricCard
          icon={<FolderKanban className="h-4 w-4" />}
          label="Total de projetos"
          value={projects.length}
        />
        <MetricCard
          icon={<Boxes className="h-4 w-4" />}
          label="Equipamentos"
          value={equipEnriched.length}
        />
        <MetricCard
          icon={<Package className="h-4 w-4" />}
          label="Materiais"
          value={matEnriched.length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">Legenda:</span>
        <LegendDot color="bg-row-late" label="Atrasado" />
        <LegendDot color="bg-row-today" label="Embarque hoje" />
        <LegendDot color="bg-card border" label="Dentro do prazo" />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Materiais — Próximos 30 dias (inclui atrasados)
        </h2>
        <Next30Section
          rows={[...matEnriched.filter((e) => isLate(e)), ...next30Mat]}
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
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Equipamentos — Próximos 30 dias (inclui atrasados)
        </h2>
        <Next30Section
          rows={[...equipEnriched.filter((e) => isLate(e)), ...next30Equip]}
          isLoading={isLoading}
          empty="Nada nos próximos 30 dias."
          hiddenColumns={["peso", "volume", "veiculo", "observacao"]}
          cargasByEquipment={cargasByEquipment}
          onAddCarga={handleAddCarga}
          onUpdateCarga={handleUpdateCarga}
          onDeleteCarga={handleDeleteCarga}
        />
      </section>
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
}: {
  rows: Next30Row[];
  isLoading: boolean;
  empty?: string;
  hiddenColumns?: ComponentProps<typeof EquipTable>["hiddenColumns"];
  cargasByEquipment?: ComponentProps<typeof EquipTable>["cargasByEquipment"];
  onAddCarga?: ComponentProps<typeof EquipTable>["onAddCarga"];
  onUpdateCarga?: ComponentProps<typeof EquipTable>["onUpdateCarga"];
  onDeleteCarga?: ComponentProps<typeof EquipTable>["onDeleteCarga"];
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
    />
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "danger" | "warning";
}) {
  const ring =
    tone === "danger"
      ? "border-danger/30 bg-danger/5"
      : tone === "warning"
        ? "border-warning/40 bg-warning/10"
        : "bg-card";
  const valueColor =
    tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning-foreground" : "";
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${ring}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
    </div>
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
