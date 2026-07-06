import { useState, type CSSProperties } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Row extends Equipment {
  project?: Project;
}

type HideableColumn =
  | "posicao"
  | "data_producao"
  | "status_producao"
  | "peso"
  | "volume"
  | "veiculo"
  | "observacao";

interface Props {
  rows: Row[];
  showProject?: boolean;
  empty?: string;
  stickyHeader?: boolean;
  /** Applied only when stickyHeader=true; the component owns its scroll container. */
  maxHeight?: string;
  hiddenColumns?: HideableColumn[];
}

const PROJ_W = 140;
const EQUIP_W = 220;
const SHADOW = "2px 0 4px -1px rgba(0,0,0,0.12)";

export function EquipTable({
  rows,
  showProject = true,
  empty = "Nenhum equipamento.",
  stickyHeader = false,
  maxHeight,
  hiddenColumns,
}: Props) {
  const today = todayISO();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { sortCriteria, handleSort, sortData } = useSort<Row>({
    posicao: "number",
    valor_unitario: "number",
    quantidade: "number",
    data_producao: "date",
    data_embarque: "date",
  });

  const hide = new Set<HideableColumn>(hiddenColumns ?? []);

  const equipLeft = showProject ? PROJ_W : 0;
  const tipoLeft = equipLeft + EQUIP_W;

  // Frozen column header: always sticky-left; additionally sticky-top when stickyHeader
  function frozenTh(left: number, extra?: CSSProperties): CSSProperties {
    return {
      position: "sticky",
      left,
      zIndex: stickyHeader ? 20 : 5,
      backgroundColor: "var(--card)",
      ...(stickyHeader ? { top: 0 } : {}),
      ...extra,
    };
  }

  // Non-frozen column header: sticky-top only when stickyHeader
  const normalTh: CSSProperties | undefined = stickyHeader
    ? { position: "sticky", top: 0, zIndex: 10, backgroundColor: "var(--card)" }
    : undefined;

  // Frozen body cell: always sticky-left
  function frozenTd(left: number, extra?: CSSProperties): CSSProperties {
    return {
      position: "sticky",
      left,
      zIndex: 1,
      backgroundColor: "var(--frozen-bg)",
      ...extra,
    };
  }

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

  // When stickyHeader=true the component owns its scroll container (same pattern as
  // equip-editor). This keeps the visual wrapper (border, bg, border-radius) and the
  // overflow container on the same element, eliminating the background-mismatch band
  // that appears when an external overflow-auto wraps an inner rounded-md element.
  const wrapperClass = stickyHeader
    ? "overflow-auto rounded-md border bg-card [&::-webkit-scrollbar-track]:bg-card [&::-webkit-scrollbar-corner]:bg-card"
    : "overflow-x-auto rounded-md border bg-card";

  const wrapperStyle: CSSProperties | undefined = stickyHeader
    ? {
        maxHeight: maxHeight ?? "600px",
        scrollbarColor:
          "color-mix(in oklch, var(--muted-foreground) 25%, transparent) var(--card)",
      }
    : undefined;

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr className="text-left">
            {showProject && (
              <th
                className="px-3 py-2 font-medium"
                style={frozenTh(0, { minWidth: `${PROJ_W}px`, maxWidth: `${PROJ_W}px` })}
              >
                <SortableHeader
                  column="project.name"
                  label="Projeto"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            <th
              className="px-3 py-2 font-medium"
              style={frozenTh(equipLeft, { minWidth: `${EQUIP_W}px`, maxWidth: `${EQUIP_W}px` })}
            >
              <SortableHeader
                column="equipamento"
                label="Equipamento"
                sortCriteria={sortCriteria}
                onSort={handleSort}
              />
            </th>
            <th className="px-3 py-2 font-medium" style={frozenTh(tipoLeft, { boxShadow: SHADOW })}>
              <SortableHeader
                column="tipo"
                label="Tipo"
                sortCriteria={sortCriteria}
                onSort={handleSort}
              />
            </th>
            {!hide.has("posicao") && (
              <th className="px-3 py-2 font-medium" style={normalTh}>
                <SortableHeader
                  column="posicao"
                  label="Posição"
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            <th
              className="px-3 py-2 text-right font-medium whitespace-nowrap min-w-[110px]"
              style={normalTh}
            >
              <SortableHeader
                column="valor_unitario"
                label="Valor"
                sortCriteria={sortCriteria}
                onSort={handleSort}
              />
            </th>
            <th className="px-3 py-2 text-right font-medium" style={normalTh}>
              <SortableHeader
                column="quantidade"
                label="Qtd"
                sortCriteria={sortCriteria}
                onSort={handleSort}
              />
            </th>
            {!hide.has("data_producao") && (
              <th className="px-3 py-2 font-medium" style={normalTh}>
                <SortableHeader
                  column="data_producao"
                  label="Data Prod."
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            {!hide.has("status_producao") && (
              <th className="px-3 py-2 font-medium" style={normalTh}>
                <SortableHeader
                  column="status_producao"
                  label="Status Prod."
                  sortCriteria={sortCriteria}
                  onSort={handleSort}
                />
              </th>
            )}
            <th className="px-3 py-2 font-medium" style={normalTh}>
              Data Faturamento
            </th>
            <th className="px-3 py-2 font-medium" style={normalTh}>
              <SortableHeader
                column="data_embarque"
                label="Data Embarque"
                sortCriteria={sortCriteria}
                onSort={handleSort}
              />
            </th>
            <th className="px-3 py-2 font-medium" style={normalTh}>
              <SortableHeader
                column="status_embarque"
                label="Status Embarque"
                sortCriteria={sortCriteria}
                onSort={handleSort}
              />
            </th>
            <th className="px-3 py-2 font-medium" style={normalTh}>
              Frete
            </th>
            {!hide.has("peso") && (
              <th className="px-3 py-2 text-right font-medium" style={normalTh}>
                Peso
              </th>
            )}
            {!hide.has("volume") && (
              <th className="px-3 py-2 text-right font-medium" style={normalTh}>
                Volume
              </th>
            )}
            {!hide.has("veiculo") && (
              <th className="px-3 py-2 font-medium" style={normalTh}>
                Veículo
              </th>
            )}
            {!hide.has("observacao") && (
              <th className="px-3 py-2 font-medium" style={normalTh}>
                Obs
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortData(rows).map((r) => {
            const late = isLate(r, today);
            const today_ = isToday(r, today);
            const mat = isTipoMaterial(r.tipo);
            const trt = r.tipo === "Material TRT";
            const bg = late ? "bg-row-late/60" : today_ ? "bg-row-today/60" : "hover:bg-muted/40";
            // Solid equivalent of the translucent row color, for frozen cell backgrounds
            const frozenBg = late
              ? "color-mix(in oklch, var(--row-late) 60%, var(--card) 40%)"
              : today_
                ? "color-mix(in oklch, var(--row-today) 60%, var(--card) 40%)"
                : undefined;
            return (
              <tr
                key={r.id}
                className={`border-t ${bg}`}
                style={frozenBg ? ({ "--frozen-bg": frozenBg } as CSSProperties) : undefined}
              >
                {showProject && (
                  <td
                    className="px-3 py-2"
                    style={frozenTd(0, {
                      minWidth: `${PROJ_W}px`,
                      maxWidth: `${PROJ_W}px`,
                      overflow: "hidden",
                    })}
                  >
                    <div className="font-medium truncate">{r.project?.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {r.project?.client}
                    </div>
                  </td>
                )}
                <td
                  className="px-3 py-2"
                  style={frozenTd(equipLeft, {
                    minWidth: `${EQUIP_W}px`,
                    maxWidth: `${EQUIP_W}px`,
                    overflow: "hidden",
                  })}
                >
                  <div className="line-clamp-2" title={r.equipamento}>
                    {r.equipamento}
                  </div>
                </td>
                <td className="px-3 py-2" style={frozenTd(tipoLeft, { boxShadow: SHADOW })}>
                  <TipoBadge value={r.tipo} />
                </td>
                {!hide.has("posicao") && (
                  <td className={`px-3 py-2 ${mat ? "text-muted-foreground/40" : ""}`}>
                    {mat ? (r.posicao ?? "") : r.posicao || "—"}
                  </td>
                )}
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap min-w-[110px]">
                  {formatBRL(r.valor_unitario)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.quantidade}</td>
                {!hide.has("data_producao") && (
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
                {!hide.has("status_producao") && (
                  <td className={`px-3 py-2 ${mat ? "text-muted-foreground/40" : ""}`}>
                    {mat ? (r.status_producao ?? "") : <ProdBadge value={r.status_producao} />}
                  </td>
                )}
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.data_faturamento)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {formatDate(r.data_embarque)}
                    {late && r.data_embarque && (
                      <LateBadge days={daysBetween(r.data_embarque, today)} />
                    )}
                    {today_ && <TodayBadge />}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <EmbarqueBadge value={r.status_embarque} />
                </td>
                <td className="px-3 py-2">{r.frete ?? "—"}</td>
                {!hide.has("peso") && (
                  <td className="px-3 py-2 text-right tabular-nums">
                    {mat ? (r.peso ?? "—") : "—"}
                  </td>
                )}
                {!hide.has("volume") && (
                  <td className="px-3 py-2 text-right tabular-nums">
                    {mat ? (r.volume ?? "—") : "—"}
                  </td>
                )}
                {!hide.has("veiculo") && (
                  <td className="px-3 py-2">{trt ? (r.veiculo ?? "—") : "—"}</td>
                )}
                {!hide.has("observacao") && (
                  <td className="px-3 py-2">
                    {mat && r.observacao ? (
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="max-w-[200px] truncate cursor-default">
                              {r.observacao}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs break-all">
                            {r.observacao}
                          </TooltipContent>
                        </Tooltip>
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
