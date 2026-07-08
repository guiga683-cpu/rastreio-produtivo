import { Fragment, useState, type CSSProperties } from "react";
import type { Carga, Equipment, Project } from "@/lib/embarques";
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
import { Copy, Check, ChevronRight, ChevronDown, Plus, Trash2 } from "lucide-react";
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
  /** Habilita o cadastro/edição de cargas por item (Material/Material TRT) — uso exclusivo do Dashboard. */
  editableCargas?: boolean;
  cargasByEquipment?: Map<string, Carga[]>;
  onAddCarga?: (equipmentId: string) => void;
  onUpdateCarga?: (id: string, patch: Partial<Carga>) => void;
  onDeleteCarga?: (id: string) => void;
}

const PROJ_W = 140;
const EQUIP_W = 220;
const EXPAND_W = 28;
const SHADOW = "2px 0 4px -1px rgba(0,0,0,0.12)";

export function EquipTable({
  rows,
  showProject = true,
  empty = "Nenhum equipamento.",
  stickyHeader = false,
  maxHeight,
  hiddenColumns,
  editableCargas = false,
  cargasByEquipment,
  onAddCarga,
  onUpdateCarga,
  onDeleteCarga,
}: Props) {
  const today = todayISO();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { sortCriteria, handleSort, sortData } = useSort<Row>({
    posicao: "number",
    valor_unitario: "number",
    quantidade: "number",
    data_producao: "date",
    data_embarque: "date",
  });

  const hide = new Set<HideableColumn>(hiddenColumns ?? []);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const expandLeft = editableCargas ? EXPAND_W : 0;
  const equipLeft = expandLeft + (showProject ? PROJ_W : 0);
  const tipoLeft = equipLeft + EQUIP_W;

  let colCount = 0;
  if (editableCargas) colCount++;
  if (showProject) colCount++;
  colCount += 2; // equipamento, tipo
  if (!hide.has("posicao")) colCount++;
  colCount += 2; // valor, qtd
  if (!hide.has("data_producao")) colCount++;
  if (!hide.has("status_producao")) colCount++;
  colCount += 3; // data faturamento, data embarque, status embarque
  colCount++; // frete
  if (!hide.has("peso")) colCount++;
  if (!hide.has("volume")) colCount++;
  if (!hide.has("veiculo")) colCount++;
  if (!hide.has("observacao")) colCount++;

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
        scrollbarColor: "color-mix(in oklch, var(--muted-foreground) 25%, transparent) var(--card)",
      }
    : undefined;

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr className="text-left">
            {editableCargas && (
              <th
                className="px-2 py-2"
                style={frozenTh(0, { minWidth: `${EXPAND_W}px`, maxWidth: `${EXPAND_W}px` })}
              />
            )}
            {showProject && (
              <th
                className="px-3 py-2 font-medium"
                style={frozenTh(expandLeft, { minWidth: `${PROJ_W}px`, maxWidth: `${PROJ_W}px` })}
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
            const cargas = cargasByEquipment?.get(r.id) ?? [];
            const cargaSum = cargas.reduce((s, c) => s + Number(c.valor || 0), 0);
            const isExpanded = editableCargas && mat && expanded.has(r.id);
            const bg = late ? "bg-row-late/60" : today_ ? "bg-row-today/60" : "hover:bg-muted/40";
            // Solid equivalent of the translucent row color, for frozen cell backgrounds
            const frozenBg = late
              ? "color-mix(in oklch, var(--row-late) 60%, var(--card) 40%)"
              : today_
                ? "color-mix(in oklch, var(--row-today) 60%, var(--card) 40%)"
                : undefined;
            return (
              <Fragment key={r.id}>
                <tr
                  className={`border-t ${bg}`}
                  style={frozenBg ? ({ "--frozen-bg": frozenBg } as CSSProperties) : undefined}
                >
                  {editableCargas && (
                    <td
                      className="px-2 py-2"
                      style={frozenTd(0, {
                        minWidth: `${EXPAND_W}px`,
                        maxWidth: `${EXPAND_W}px`,
                      })}
                    >
                      {mat && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(r.id)}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                          title="Cargas"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </td>
                  )}
                  {showProject && (
                    <td
                      className="px-3 py-2"
                      style={frozenTd(expandLeft, {
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
                    {editableCargas && cargas.length > 0
                      ? formatBRL(cargaSum)
                      : formatBRL(r.valor_unitario)}
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
                  {!hide.has("peso") && <td className="px-3 py-2 text-right tabular-nums">—</td>}
                  {!hide.has("volume") && <td className="px-3 py-2 text-right tabular-nums">—</td>}
                  {!hide.has("veiculo") && <td className="px-3 py-2">—</td>}
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
                {isExpanded && (
                  <tr className="border-t bg-muted/20">
                    <td colSpan={colCount} className="p-0">
                      <CargasEditor
                        equipmentId={r.id}
                        cargas={cargas}
                        onAdd={onAddCarga}
                        onUpdate={onUpdateCarga}
                        onDelete={onDeleteCarga}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CargasEditor({
  equipmentId,
  cargas,
  onAdd,
  onUpdate,
  onDelete,
}: {
  equipmentId: string;
  cargas: Carga[];
  onAdd?: (equipmentId: string) => void;
  onUpdate?: (id: string, patch: Partial<Carga>) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="space-y-2 p-3">
      <div className="space-y-1.5">
        {cargas.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-1.5">
            <input
              value={c.descricao}
              placeholder="Descrição"
              onChange={(e) => onUpdate?.(c.id, { descricao: e.target.value })}
              className="w-40 rounded border bg-background px-2 py-1 text-xs"
            />
            <input
              type="number"
              step="0.01"
              value={c.valor}
              placeholder="Valor"
              onChange={(e) => onUpdate?.(c.id, { valor: Number(e.target.value) })}
              className="w-28 rounded border bg-background px-2 py-1 text-right text-xs"
            />
            <input
              type="number"
              step="0.01"
              value={c.peso ?? ""}
              placeholder="Peso"
              onChange={(e) =>
                onUpdate?.(c.id, { peso: e.target.value ? Number(e.target.value) : null })
              }
              className="w-20 rounded border bg-background px-2 py-1 text-right text-xs"
            />
            <input
              type="number"
              step="0.01"
              value={c.volume ?? ""}
              placeholder="Volume"
              onChange={(e) =>
                onUpdate?.(c.id, { volume: e.target.value ? Number(e.target.value) : null })
              }
              className="w-20 rounded border bg-background px-2 py-1 text-right text-xs"
            />
            <input
              value={c.veiculo ?? ""}
              placeholder="Veículo"
              onChange={(e) => onUpdate?.(c.id, { veiculo: e.target.value || null })}
              className="w-28 rounded border bg-background px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => onDelete?.(c.id)}
              className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
              title="Remover carga"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {cargas.length === 0 && (
          <div className="text-xs text-muted-foreground">Nenhuma carga cadastrada.</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onAdd?.(equipmentId)}
        className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Nova carga
      </button>
    </div>
  );
}
