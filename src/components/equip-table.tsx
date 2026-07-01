import { useState } from "react";
import type { Equipment, Project } from "@/lib/embarques";
import {
  formatBRL,
  daysBetween,
  formatDate,
  isLate,
  isToday,
  isTipoMaterial,
  todayISO,
} from "@/lib/embarques";
import { EmbarqueBadge, LateBadge, ProdBadge, TodayBadge, TipoBadge } from "@/components/badges";
import { Copy, Check } from "lucide-react";
import { useSort } from "@/hooks/useSort";
import { SortableHeader } from "@/components/sortable-header";

interface Row extends Equipment {
  project?: Project;
}

type ColumnKey =
  | "project"
  | "equipamento"
  | "tipo"
  | "posicao"
  | "valor_unitario"
  | "quantidade"
  | "data_producao"
  | "status_producao"
  | "data_faturamento"
  | "data_embarque"
  | "status_embarque"
  | "frete"
  | "peso"
  | "volume"
  | "veiculo"
  | "observacao";

interface Props {
  rows: Row[];
  showProject?: boolean;
  empty?: string;
  stickyHeader?: boolean;
  hiddenColumns?: ColumnKey[];
}

export function EquipTable({
  rows,
  showProject = true,
  empty = "Nenhum equipamento.",
  stickyHeader = false,
  hiddenColumns = [],
}: Props) {
  const hidden = new Set<ColumnKey>(hiddenColumns);
  const show = (c: ColumnKey) => !hidden.has(c);
  const today = todayISO();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { sortCriteria, handleSort, sortData } = useSort<Row>({
    posicao: "number",
    valor_unitario: "number",
    quantidade: "number",
    data_producao: "date",
    data_embarque: "date",
  });

  function copyObs(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  const theadStyle = stickyHeader
    ? ({ position: "sticky", top: 0, zIndex: 10, backgroundColor: "var(--card)" } as const)
    : undefined;

  return (
    <div
      className={
        stickyHeader ? "rounded-md border bg-card" : "overflow-x-auto rounded-md border bg-card"
      }
    >
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-muted-foreground" style={theadStyle}>
          <tr className="text-left">
            {showProject && show("project") && (
              <th className="px-3 py-2 font-medium" style={{ minWidth: "130px" }}>
                <SortableHeader
                  column="project.name"
                  label="Projeto"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("equipamento") && (
              <th className="px-3 py-2 font-medium">
                <SortableHeader
                  column="equipamento"
                  label="Equipamento"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("tipo") && (
              <th className="px-3 py-2 font-medium">
                <SortableHeader
                  column="tipo"
                  label="Tipo"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("posicao") && (
              <th className="px-3 py-2 font-medium">
                <SortableHeader
                  column="posicao"
                  label="Posição"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("valor_unitario") && (
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap min-w-[110px]">
                <SortableHeader
                  column="valor_unitario"
                  label="Valor"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("quantidade") && (
              <th className="px-3 py-2 text-right font-medium">
                <SortableHeader
                  column="quantidade"
                  label="Qtd"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("data_producao") && (
              <th className="px-3 py-2 font-medium">
                <SortableHeader
                  column="data_producao"
                  label="Data Prod."
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("status_producao") && (
              <th className="px-3 py-2 font-medium">
                <SortableHeader
                  column="status_producao"
                  label="Status Prod."
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("data_faturamento") && (
              <th className="px-3 py-2 font-medium">Data Faturamento</th>
            )}
            {show("data_embarque") && (
              <th className="px-3 py-2 font-medium">
                <SortableHeader
                  column="data_embarque"
                  label="Data Embarque"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("status_embarque") && (
              <th className="px-3 py-2 font-medium">
                <SortableHeader
                  column="status_embarque"
                  label="Status Embarque"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {show("frete") && <th className="px-3 py-2 font-medium">Frete</th>}
            {show("peso") && <th className="px-3 py-2 text-right font-medium">Peso</th>}
            {show("volume") && <th className="px-3 py-2 text-right font-medium">Volume</th>}
            {show("veiculo") && <th className="px-3 py-2 font-medium">Veículo</th>}
            {show("observacao") && <th className="px-3 py-2 font-medium">Obs</th>}
          </tr>
        </thead>
        <tbody>
          {sortData(rows).map((r) => {
            const late = isLate(r, today);
            const today_ = isToday(r, today);
            const mat = isTipoMaterial(r.tipo);
            const bg = late ? "bg-row-late/60" : today_ ? "bg-row-today/60" : "hover:bg-muted/40";
            return (
              <tr key={r.id} className={`border-t ${bg}`}>
                {showProject && show("project") && (
                  <td className="px-3 py-2" style={{ minWidth: "130px" }}>
                    <div className="font-medium">{r.project?.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.project?.client}</div>
                  </td>
                )}
                {show("equipamento") && (
                  <td className="px-3 py-2 max-w-[420px]">
                    <div className="line-clamp-2" title={r.equipamento}>
                      {r.equipamento}
                    </div>
                  </td>
                )}
                {show("tipo") && (
                  <td className="px-3 py-2">
                    <TipoBadge value={r.tipo} />
                  </td>
                )}
                {show("posicao") && (
                  <td className={`px-3 py-2 ${mat ? "text-muted-foreground/40" : ""}`}>
                    {mat ? (r.posicao ?? "") : r.posicao || "—"}
                  </td>
                )}
                {show("valor_unitario") && (
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap min-w-[110px]">
                    {formatBRL(r.valor_unitario)}
                  </td>
                )}
                {show("quantidade") && (
                  <td className="px-3 py-2 text-right tabular-nums">{r.quantidade}</td>
                )}
                {show("data_producao") && (
                  <td
                    className={`px-3 py-2 whitespace-nowrap ${mat ? "text-muted-foreground/40" : ""}`}
                  >
                    {mat
                      ? r.data_producao
                        ? formatDate(r.data_producao)
                        : ""
                      : formatDate(r.data_producao)}
                  </td>
                )}
                {show("status_producao") && (
                  <td className={`px-3 py-2 ${mat ? "text-muted-foreground/40" : ""}`}>
                    {mat ? (r.status_producao ?? "") : <ProdBadge value={r.status_producao} />}
                  </td>
                )}
                {show("data_faturamento") && (
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.data_faturamento)}</td>
                )}
                {show("data_embarque") && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {formatDate(r.data_embarque)}
                      {late && r.data_embarque && (
                        <LateBadge days={daysBetween(r.data_embarque, today)} />
                      )}
                      {today_ && <TodayBadge />}
                    </div>
                  </td>
                )}
                {show("status_embarque") && (
                  <td className="px-3 py-2">
                    <EmbarqueBadge value={r.status_embarque} />
                  </td>
                )}
                {show("frete") && <td className="px-3 py-2">{r.frete ?? "—"}</td>}
                {show("peso") && (
                  <td className="px-3 py-2 text-right tabular-nums">
                    {mat ? (r.peso ?? "—") : "—"}
                  </td>
                )}
                {show("volume") && (
                  <td className="px-3 py-2 text-right tabular-nums">
                    {mat ? (r.volume ?? "—") : "—"}
                  </td>
                )}
                {show("veiculo") && (
                  <td className="px-3 py-2">{mat ? (r.veiculo ?? "—") : "—"}</td>
                )}
                {show("observacao") && (
                  <td className="px-3 py-2">
                    {mat && r.observacao ? (
                      <div className="flex items-center gap-1">
                        <span className="max-w-[200px] truncate">{r.observacao}</span>
                        <button
                          type="button"
                          onClick={() => copyObs(r.id, r.observacao!)}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                          title="Copiar observação"
                        >
                          {copiedId === r.id ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

