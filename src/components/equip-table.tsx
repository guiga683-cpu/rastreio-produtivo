import type { Equipment, Project } from "@/lib/embarques";
import { formatBRL, daysBetween, formatDate, isLate, isToday, todayISO } from "@/lib/embarques";
import { EmbarqueBadge, LateBadge, ProdBadge, TodayBadge, TipoBadge } from "@/components/badges";

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
        <thead className="bg-muted/60 text-muted-foreground">
          <tr className="text-left">
            {showProject && <th className="px-3 py-2 font-medium">Projeto</th>}
            {showProject && <th className="px-3 py-2 font-medium">Cliente</th>}
            <th className="px-3 py-2 font-medium">Equipamento</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Posição</th>
            <th className="px-3 py-2 text-right font-medium">Valor Un</th>
            <th className="px-3 py-2 text-right font-medium">Qtd</th>
            <th className="px-3 py-2 font-medium">Data Prod.</th>
            <th className="px-3 py-2 font-medium">Status Prod.</th>
            <th className="px-3 py-2 font-medium">Data Embarque</th>
            <th className="px-3 py-2 font-medium">Status Embarque</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const late = isLate(r, today);
            const today_ = isToday(r, today);
            const bg = late
              ? "bg-row-late/60"
              : today_
                ? "bg-row-today/60"
                : "hover:bg-muted/40";
            return (
              <tr key={r.id} className={`border-t ${bg}`}>
                {showProject && <td className="px-3 py-2 font-medium">{r.project?.name}</td>}
                {showProject && <td className="px-3 py-2">{r.project?.client}</td>}
                <td className="px-3 py-2 max-w-[420px]">
                  <div className="line-clamp-2">{r.equipamento}</div>
                </td>
                <td className="px-3 py-2"><TipoBadge value={r.tipo} /></td>
                <td className="px-3 py-2">{r.posicao}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatBRL(r.valor_unitario)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.quantidade}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.data_producao)}</td>
                <td className="px-3 py-2">
                  <ProdBadge value={r.status_producao} />
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
