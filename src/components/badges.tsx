import type { StatusEmbarque, StatusProducao, TipoItem } from "@/lib/embarques";

export function ProdBadge({ value }: { value: StatusProducao | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const cls = value === "OK" ? "bg-success/15 text-success" : "bg-danger/15 text-danger";
  return <span className={`pill ${cls}`}>{value}</span>;
}

export function EmbarqueBadge({ value }: { value: StatusEmbarque }) {
  const cls =
    value === "Expedido"
      ? "bg-success/15 text-success"
      : value === "Cancelado"
        ? "bg-muted text-muted-foreground"
        : "bg-warning/20 text-warning-foreground";
  return <span className={`pill ${cls}`}>{value}</span>;
}

export function LateBadge({ days }: { days: number }) {
  return <span className="pill bg-danger text-danger-foreground">{days}d atraso</span>;
}

export function TodayBadge() {
  return <span className="pill bg-warning text-warning-foreground">hoje</span>;
}

export function TipoBadge({ value }: { value: TipoItem }) {
  const cls =
    value === "Material"
      ? "bg-warning/20 text-warning-foreground"
      : value === "Material TRT"
        ? "bg-purple-100 text-purple-700"
        : "bg-primary/10 text-primary";
  return <span className={`pill ${cls}`}>{value}</span>;
}
