import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Equipment, Project } from "@/lib/embarques";
import { isLate, isNext30, subtotal } from "@/lib/embarques";
import { EquipTable } from "@/components/equip-table";
import { AlertTriangle, CalendarClock, FolderKanban, Boxes } from "lucide-react";
import { useEffect } from "react";
import { seedExampleIfEmpty } from "@/lib/seed";
import { useSortedRows, type SortKeyDef } from "@/hooks/useSortedRows";
import { SortBar } from "@/components/sort-bar";

type Next30Row = Equipment & { project?: Project };

const NEXT30_SORT_KEYS: Record<"cliente" | "data" | "valor" | "projeto", SortKeyDef<Next30Row>> = {
  cliente: { label: "Cliente", defaultDir: "asc", get: (r) => r.project?.client ?? null },
  data: { label: "Data Embarque", defaultDir: "asc", get: (r) => r.data_embarque },
  valor: { label: "Valor", defaultDir: "desc", get: (r) => subtotal(r) },
  projeto: { label: "Projeto", defaultDir: "asc", get: (r) => r.project?.name ?? null },
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Embarques" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["all-data"],
    queryFn: async () => {
      const [pRes, eRes] = await Promise.all([
        supabase.from("projects").select("id,name,client").order("created_at"),
        supabase.from("equipments").select("*").order("created_at"),
      ]);
      if (pRes.error) throw pRes.error;
      if (eRes.error) throw eRes.error;
      return {
        projects: (pRes.data ?? []) as Project[],
        equipments: (eRes.data ?? []) as Equipment[],
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
  const pById = new Map(projects.map((p) => [p.id, p]));
  const enriched = equipments.map((e) => ({ ...e, project: pById.get(e.project_id) }));

  const late = enriched.filter((e) => isLate(e));
  const next30 = enriched.filter((e) => isNext30(e));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos embarques.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Atrasados"
          value={late.length}
          tone="danger"
        />
        <MetricCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Próximos 30 dias"
          value={next30.length}
          tone="warning"
        />
        <MetricCard
          icon={<FolderKanban className="h-4 w-4" />}
          label="Total de projetos"
          value={projects.length}
        />
        <MetricCard
          icon={<Boxes className="h-4 w-4" />}
          label="Total de equipamentos"
          value={equipments.length}
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
          Atrasados
        </h2>
        <EquipTable rows={late} empty={isLoading ? "Carregando…" : "Nenhum atraso. 🎉"} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Próximos 30 dias
        </h2>
        <EquipTable
          rows={next30}
          empty={isLoading ? "Carregando…" : "Nada nos próximos 30 dias."}
        />
      </section>
    </div>
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
