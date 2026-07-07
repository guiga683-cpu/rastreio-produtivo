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
  /** Dashboard-only: enables editable cargas UI for Material TRT rows and read-only Frete=sum. */
  editableCargas?: boolean;
  cargasByEquipment?: Map<string, Carga[]>;
  onAddCarga?: (equipmentId: string) => void;
  onUpdateCarga?: (id: string, patch: Partial<Carga>) => void;
  onDeleteCarga?: (id: string) => void;
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

  const equipLeft = showProject ? PROJ_W : 0;
  const tipoLeft = equipLeft + EQUIP_W;

  // Contagem de colunas visíveis (para colSpan do expand row)
  const colCount =
    (showProject ? 1 : 0) +
    (editableCargas ? 1 : 0) +
    2 /* equipamento, tipo */ +
    (hide.has("posicao") ? 0 : 1) +
    2 /* valor_unitario, quantidade */ +
    (hide.has("data_producao") ? 0 : 1) +
    (hide.has("status_producao") ? 0 : 1) +
    3 /* data_faturamento, data_embarque, status_embarque */ +
    1 /* frete */ +
    (hide.has("peso") ? 0 : 1) +
    (hide.has("volume") ? 0 : 1) +
    (hide.has("veiculo") ? 0 : 1) +
    (hide.has("observacao") ? 0 : 1);

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

  const normalTh: CSSProperties | undefined = stickyHeader
    ? { position: "sticky", top: 0, zIndex: 10, backgroundColor: "var(--card)" }
    : undefined;

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

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cargasFor(id: string): Carga[] {
    return cargasByEquipment?.get(id) ?? [];
  }

  function sumCargas(id: string): number {
    return cargasFor(id).reduce((s, c) => s + Number(c.valor || 0), 0);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

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
            {editableCargas && (
              <th className="px-1 py-2 w-6" style={normalTh}></th>
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
            const frozenBg = late
              ? "color-mix(in oklch, var(--row-late) 60%, var(--card) 40%)"
              : today_
                ? "color-mix(in oklch, var(--row-today) 60%, var(--card) 40%)"
                : undefined;

            const rowCargas = trt && editableCargas ? cargasFor(r.id) : [];
            const cargaSum = trt && editableCargas ? sumCargas(r.id) : 0;
            const isExpanded = expanded.has(r.id);
            const showFreteAsSum = trt && editableCargas && rowCargas.length > 0;

            return (
              <Fragment key={r.id}>
                <tr
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
                  {editableCargas && (
                    <td className="px-1 py-2 w-6 align-middle">
                      {trt ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(r.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={isExpanded ? "Ocultar cargas" : "Ver cargas"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : null}
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
                  <td className="px-3 py-2 whitespace-nowrap">
                    {showFreteAsSum ? (
                      <span
                        className="tabular-nums font-medium"
                        title="Soma dos valores das cargas"
                      >
                        {formatBRL(cargaSum)}
                      </span>
                    ) : (
                      (r.frete ?? "—")
                    )}
                  </td>
                  {!hide.has("peso") && (
                    <td className="px-3 py-2 text-right tabular-nums">
                      {trt ? "—" : mat ? (r.peso ?? "—") : "—"}
                    </td>
                  )}
                  {!hide.has("volume") && (
                    <td className="px-3 py-2 text-right tabular-nums">
                      {trt ? "—" : mat ? (r.volume ?? "—") : "—"}
                    </td>
                  )}
                  {!hide.has("veiculo") && (
                    <td className="px-3 py-2">{trt ? "—" : (mat ? (r.veiculo ?? "—") : "—")}</td>
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
                {trt && editableCargas && isExpanded && (
                  <tr key={`${r.id}-cargas`} className="border-t bg-muted/20">
                    <td colSpan={colCount} className="p-3">
                      <CargasEditor
                        cargas={rowCargas}
                        onAdd={() => onAddCarga?.(r.id)}
                        onUpdate={(id, patch) => onUpdateCarga?.(id, patch)}
                        onDelete={(id) => onDeleteCarga?.(id)}
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
  cargas,
  onAdd,
  onUpdate,
  onDelete,
}: {
  cargas: Carga[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Carga>) => void;
  onDelete: (id: string) => void;
}) {
  const total = cargas.reduce((s, c) => s + Number(c.valor || 0), 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Cargas
        </div>
        <div className="text-xs">
          Total:{" "}
          <span className="font-semibold tabular-nums">{formatBRL(total)}</span>
        </div>
      </div>
      {cargas.length === 0 && (
        <div className="rounded-md border border-dashed bg-background/50 px-3 py-4 text-center text-xs text-muted-foreground">
          Nenhuma carga cadastrada.
        </div>
      )}
      {cargas.length > 0 && (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-left">
                <th className="px-2 py-1.5 font-medium">Descrição</th>
                <th className="px-2 py-1.5 text-right font-medium">Valor</th>
                <th className="px-2 py-1.5 text-right font-medium">Peso</th>
                <th className="px-2 py-1.5 text-right font-medium">Volume</th>
                <th className="px-2 py-1.5 font-medium">Veículo</th>
                <th className="px-2 py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {cargas.map((c) => (
                <CargaRow key={c.id} carga={c} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3 w-3" /> Adicionar carga
      </button>
    </div>
  );
}

function CargaRow({
  carga,
  onUpdate,
  onDelete,
}: {
  carga: Carga;
  onUpdate: (id: string, patch: Partial<Carga>) => void;
  onDelete: (id: string) => void;
}) {
  const [descricao, setDescricao] = useState(carga.descricao ?? "");
  const [valor, setValor] = useState(String(carga.valor ?? 0));
  const [peso, setPeso] = useState(carga.peso == null ? "" : String(carga.peso));
  const [volume, setVolume] = useState(carga.volume == null ? "" : String(carga.volume));
  const [veiculo, setVeiculo] = useState(carga.veiculo ?? "");

  function commit(patch: Partial<Carga>) {
    onUpdate(carga.id, patch);
  }

  return (
    <tr className="border-t">
      <td className="px-2 py-1.5">
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          onBlur={() => descricao !== (carga.descricao ?? "") && commit({ descricao })}
          className="w-40 rounded border bg-background px-2 py-1 text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={() => {
            const n = Number(valor) || 0;
            if (n !== Number(carga.valor)) commit({ valor: n });
          }}
          className="w-24 rounded border bg-background px-2 py-1 text-right text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.01"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          onBlur={() => {
            const n = peso === "" ? null : Number(peso);
            if (n !== (carga.peso ?? null)) commit({ peso: n });
          }}
          className="w-20 rounded border bg-background px-2 py-1 text-right text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          onBlur={() => {
            const n = volume === "" ? null : Number(volume);
            if (n !== (carga.volume ?? null)) commit({ volume: n });
          }}
          className="w-20 rounded border bg-background px-2 py-1 text-right text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          value={veiculo}
          onChange={(e) => setVeiculo(e.target.value)}
          onBlur={() => {
            const v = veiculo || null;
            if (v !== (carga.veiculo ?? null)) commit({ veiculo: v });
          }}
          className="w-32 rounded border bg-background px-2 py-1 text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <button
          type="button"
          onClick={() => {
            if (confirm("Remover esta carga?")) onDelete(carga.id);
          }}
          className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
          title="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
