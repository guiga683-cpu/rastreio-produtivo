import { useState } from "react";
import type { Equipment, Project } from "@/lib/embarques";
import { formatBRL, daysBetween, formatDate, isLate, isToday, todayISO } from "@/lib/embarques";
import { EmbarqueBadge, LateBadge, ProdBadge, TodayBadge, TipoBadge } from "@/components/badges";
import { Copy, Check } from "lucide-react";

interface Row extends Equipment {
  project?: Project;
}

interface Props {
  rows: Row[];
  showProject?: boolean;
  empty?: string;
}

export function EquipTable({ rows, showProject = true, empty = "Nenhum equipamento." }: Props) {
  const today = todayISO();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-muted text-muted-foreground shadow-sm">
          <tr className="text-left">
            {showProject && <th className="px-3 py-2 font-medium">Projeto</th>}
            {showProject && <th className="px-3 py-2 font-medium">Cliente</th>}
            <th className="px-3 py-2 font-medium">Equipamento</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Posição</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap min-w-[110px]">
              Valor
            </th>
            <th className="px-3 py-2 text-right font-medium">Qtd</th>
            <th className="px-3 py-2 font-medium">Data Prod.</th>
            <th className="px-3 py-2 font-medium">Status Prod.</th>
            <th className="px-3 py-2 font-medium">Data Embarque</th>
            <th className="px-3 py-2 font-medium">Status Embarque</th>
            <th className="px-3 py-2 font-medium">Data Fat.</th>
            <th className="px-3 py-2 font-medium">Frete</th>
            <th className="px-3 py-2 text-right font-medium">Peso</th>
            <th className="px-3 py-2 text-right font-medium">Volume</th>
            <th className="px-3 py-2 font-medium">Obs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const late = isLate(r, today);
            const today_ = isToday(r, today);
            const trt = r.tipo === "Material TRT";
            const bg = late ? "bg-row-late/60" : today_ ? "bg-row-today/60" : "hover:bg-muted/40";
            return (
              <tr key={r.id} className={`border-t ${bg}`}>
                {showProject && <td className="px-3 py-2 font-medium">{r.project?.name}</td>}
                {showProject && <td className="px-3 py-2">{r.project?.client}</td>}
                <td className="px-3 py-2 max-w-[420px]">
                  <div className="line-clamp-2">{r.equipamento}</div>
                </td>
                <td className="px-3 py-2">
                  <TipoBadge value={r.tipo} />
                </td>
                <td className="px-3 py-2">{trt ? "—" : r.posicao || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap min-w-[110px]">
                  {formatBRL(r.valor_unitario)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.quantidade}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {trt ? "—" : formatDate(r.data_producao)}
                </td>
                <td className="px-3 py-2">
                  {trt ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <ProdBadge value={r.status_producao} />
                  )}
                </td>
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
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.data_faturamento)}</td>
                <td className="px-3 py-2">{trt ? (r.frete ?? "—") : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{trt ? (r.peso ?? "—") : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {trt ? (r.volume ?? "—") : "—"}
                </td>
                <td className="px-3 py-2">
                  {trt && r.observacao ? (
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
