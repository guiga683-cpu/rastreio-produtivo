import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  type Equipment,
  type Project,
  type TipoItem,
  formatBRL,
  formatDate,
  subtotal,
  MESES_PT,
} from "@/lib/embarques";
import { TipoBadge, EmbarqueBadge } from "@/components/badges";

export const Route = createFileRoute("/_authenticated/faturamento")({
  head: () => ({ meta: [{ title: "Faturamento — Embarques" }] }),
  component: FaturamentoPage,
});

type FatRow = Equipment & { project?: Project };

function FaturamentoPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["fat-data"],
    queryFn: async () => {
      const [pRes, eRes, mRes] = await Promise.all([
        supabase.from("projects").select("id,name,client").order("created_at"),
        supabase.from("equipments").select("*").order("created_at"),
        supabase.from("metas_faturamento").select("ano,valor"),
      ]);
      if (pRes.error) throw pRes.error;
      if (eRes.error) throw eRes.error;
      if (mRes.error) throw mRes.error;
      return {
        projects: (pRes.data ?? []) as Project[],
        equipments: (eRes.data ?? []) as Equipment[],
        metas: (mRes.data ?? []) as { ano: number; valor: number }[],
      };
    },
  });

  const projects = data?.projects ?? [];
  const equipments = data?.equipments ?? [];
  const metas = data?.metas ?? [];

  const pById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // Anos disponíveis
  const anosDisponiveis = useMemo(() => {
    const s = new Set<number>();
    equipments.forEach((e) => {
      if (e.data_embarque && e.status_embarque !== "Cancelado")
        s.add(Number(e.data_embarque.slice(0, 4)));
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [equipments]);

  // Filtros
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState<string>(String(currentYear));
  const [projetoId, setProjetoId] = useState<string>("Todos");
  const [tipoFiltro, setTipoFiltro] = useState<"Todos" | TipoItem>("Todos");
  const [mes, setMes] = useState<string>("Todos");
  const [mostrarFuturo, setMostrarFuturo] = useState(false);

  useEffect(() => {
    setMes("Todos");
  }, [ano]);

  // Itens-base: descarta cancelados e itens sem data_embarque
  const baseItens = useMemo<FatRow[]>(() => {
    return equipments
      .filter((e) => e.status_embarque !== "Cancelado" && e.data_embarque)
      .map((e) => ({ ...e, project: pById.get(e.project_id) }));
  }, [equipments, pById]);

  // Aplicar filtros (sem o filtro de Mês ainda para popular o dropdown)
  const aplicarFiltrosBase = (item: FatRow) => {
    if (ano !== "Todos" && item.data_embarque!.slice(0, 4) !== ano) return false;
    if (projetoId !== "Todos" && item.project_id !== projetoId) return false;
    if (tipoFiltro !== "Todos" && item.tipo !== tipoFiltro) return false;
    return true;
  };

  const mesesDisponiveis = useMemo(() => {
    const s = new Set<number>();
    baseItens.filter(aplicarFiltrosBase).forEach((e) => {
      s.add(Number(e.data_embarque!.slice(5, 7)));
    });
    return Array.from(s).sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItens, ano, projetoId, tipoFiltro]);

  const itensFiltrados = useMemo<FatRow[]>(() => {
    return baseItens.filter((e) => {
      if (!aplicarFiltrosBase(e)) return false;
      if (mes !== "Todos" && e.data_embarque!.slice(5, 7) !== mes) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItens, ano, projetoId, tipoFiltro, mes]);

  const itensConsiderados = mostrarFuturo
    ? itensFiltrados
    : itensFiltrados.filter((e) => e.status_embarque === "Expedido");

  // Totais
  const tot = (items: FatRow[]) => items.reduce((s, i) => s + subtotal(i), 0);
  const faturado = tot(itensFiltrados.filter((e) => e.status_embarque === "Expedido"));
  const futuro = tot(itensFiltrados.filter((e) => e.status_embarque === "Não expedido"));
  const total = mostrarFuturo ? faturado + futuro : faturado;

  // Pizza por 4 categorias
  const slices = useMemo(() => {
    const fEq = tot(itensFiltrados.filter(
      (e) => e.status_embarque === "Expedido" && e.tipo === "Equipamento",
    ));
    const fMa = tot(itensFiltrados.filter(
      (e) => e.status_embarque === "Expedido" && e.tipo === "Material",
    ));
    const xEq = tot(itensFiltrados.filter(
      (e) => e.status_embarque === "Não expedido" && e.tipo === "Equipamento",
    ));
    const xMa = tot(itensFiltrados.filter(
      (e) => e.status_embarque === "Não expedido" && e.tipo === "Material",
    ));
    const arr = [
      { label: "Equipamento — Faturado", value: fEq, color: "#185FA5", opacity: 1 },
      { label: "Material — Faturado",    value: fMa, color: "#D97706", opacity: 1 },
    ];
    if (mostrarFuturo) {
      arr.push(
        { label: "Equipamento — Futuro", value: xEq, color: "#185FA5", opacity: 0.5 },
        { label: "Material — Futuro",    value: xMa, color: "#D97706", opacity: 0.5 },
      );
    }
    return arr.filter((s) => s.value > 0);
  }, [itensFiltrados, mostrarFuturo]);

  // Barras mês a mês (somente quando ano específico)
  const monthly = useMemo(() => {
    const arr = MESES_PT.map(() => ({ fat: 0, fut: 0 }));
    if (ano === "Todos") return arr;
    itensFiltrados.forEach((e) => {
      if (e.data_embarque!.slice(0, 4) !== ano) return;
      const m = Number(e.data_embarque!.slice(5, 7)) - 1;
      const v = subtotal(e);
      if (e.status_embarque === "Expedido") arr[m].fat += v;
      else if (mostrarFuturo) arr[m].fut += v;
    });
    return arr;
  }, [itensFiltrados, ano, mostrarFuturo]);
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.fat + m.fut));

  // Meta do ano
  const metaAtual = metas.find((m) => m.ano === Number(ano))?.valor ?? 0;
  const [metaInput, setMetaInput] = useState<string>("");
  useEffect(() => {
    setMetaInput(metaAtual ? String(metaAtual) : "");
  }, [ano, metaAtual]);

  async function salvarMeta() {
    if (ano === "Todos") return;
    const v = Number(metaInput) || 0;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("metas_faturamento")
      .upsert(
        { user_id: u.user.id, ano: Number(ano), valor: v },
        { onConflict: "user_id,ano" },
      );
    if (error) alert(error.message);
    else qc.invalidateQueries({ queryKey: ["fat-data"] });
  }

  // Faturado do ano (independente de mês/projeto/tipo? — usamos ano selecionado, todos os filtros)
  const faturadoDoAno = useMemo(() => {
    if (ano === "Todos") return 0;
    return baseItens
      .filter((e) =>
        e.status_embarque === "Expedido" && e.data_embarque!.slice(0, 4) === ano,
      )
      .reduce((s, i) => s + subtotal(i), 0);
  }, [baseItens, ano]);

  const pctMeta = metaAtual > 0 ? Math.min(100, (faturadoDoAno / metaAtual) * 100) : 0;
  const faltaMeta = Math.max(0, metaAtual - faturadoDoAno);
  const atingida = metaAtual > 0 && faturadoDoAno >= metaAtual;

  // Alerta: itens Expedido sem valor
  const semValor = equipments.filter(
    (e) => e.status_embarque === "Expedido" && (!e.valor_unitario || Number(e.valor_unitario) === 0),
  );

  function exportCSV() {
    const sep = ";";
    const header = [
      "Projeto", "Cliente", "Equipamento", "Tipo", "Quantidade",
      "Valor Unitario", "Subtotal", "Data Embarque", "Status", "Situacao",
    ].join(sep);
    const lines = itensConsiderados.map((e) => {
      const num = (n: number) => n.toFixed(2).replace(".", ",");
      const sit = e.status_embarque === "Expedido" ? "Faturado" : "Futuro";
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [
        esc(e.project?.name ?? ""),
        esc(e.project?.client ?? ""),
        esc(e.equipamento),
        e.tipo,
        e.quantidade,
        num(Number(e.valor_unitario)),
        num(subtotal(e)),
        e.data_embarque ?? "",
        e.status_embarque,
        sit,
      ].join(sep);
    });
    const csv = "\uFEFF" + [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturamento_${ano}_${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Faturamento</h1>
        <p className="text-sm text-muted-foreground">
          Faturado = itens <strong>Expedido</strong>. Futuro = ainda não expedidos
          (sempre exibidos com 50% de transparência). Itens cancelados ficam de fora.
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {semValor.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-xs text-warning-foreground">
          <AlertTriangle className="h-4 w-4" />
          {semValor.length} item(s) com status <strong>Expedido</strong> estão sem
          valor unitário — o faturamento pode estar subestimado.
        </div>
      )}

      {/* Filtros + Pizza */}
      <div className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <FiltroSelect label="Ano" value={ano} onChange={setAno}>
            <option value="Todos">Todos os anos</option>
            {anosDisponiveis.map((a) => (
              <option key={a} value={String(a)}>{a}</option>
            ))}
          </FiltroSelect>
          <FiltroSelect label="Projeto" value={projetoId} onChange={setProjetoId}>
            <option value="Todos">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.client}</option>
            ))}
          </FiltroSelect>
          <FiltroSelect label="Tipo" value={tipoFiltro} onChange={(v) => setTipoFiltro(v as typeof tipoFiltro)}>
            <option value="Todos">Todos</option>
            <option value="Equipamento">Equipamento</option>
            <option value="Material">Material</option>
          </FiltroSelect>
          <FiltroSelect label="Mês" value={mes} onChange={setMes}>
            <option value="Todos">Todos os meses</option>
            {mesesDisponiveis.map((m) => (
              <option key={m} value={String(m).padStart(2, "0")}>
                {MESES_PT[m - 1]}
              </option>
            ))}
          </FiltroSelect>
          <label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm">
            <input
              type="checkbox"
              checked={mostrarFuturo}
              onChange={(e) => setMostrarFuturo(e.target.checked)}
              className="h-4 w-4"
            />
            Mostrar faturamento futuro
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-8 pt-2">
          <PieChart slices={slices} total={total} />
          <div className="flex-1 min-w-[240px] space-y-2">
            <div className="text-3xl font-semibold tabular-nums text-primary">
              {formatBRL(total)}
            </div>
            <div className="text-xs text-muted-foreground">Total do filtro selecionado</div>
            <div className="space-y-1 pt-2">
              {slices.length === 0 && (
                <div className="text-xs text-muted-foreground">Sem dados para este filtro.</div>
              )}
              {slices.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-3 rounded-sm border"
                    style={{ background: s.color, opacity: s.opacity }}
                  />
                  <span className="flex-1 text-muted-foreground">{s.label}</span>
                  <span className="tabular-nums">
                    {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                  </span>
                  <span className="w-28 text-right font-medium tabular-nums">
                    {formatBRL(s.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meta anual */}
        <div className="mt-2 border-t pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Meta de faturamento ({ano === "Todos" ? "ano" : ano})
              </label>
              <input
                type="number"
                value={metaInput}
                onChange={(e) => setMetaInput(e.target.value)}
                onBlur={salvarMeta}
                disabled={ano === "Todos"}
                placeholder="0"
                className="w-48 rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
              />
            </div>
            <div className="flex-1 min-w-[240px]">
              <div className="h-5 overflow-hidden rounded-full border bg-muted">
                <div
                  className={`h-full transition-all ${atingida ? "bg-primary" : "bg-success"}`}
                  style={{ width: `${pctMeta}%` }}
                />
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {ano === "Todos" ? (
                  "Selecione um ano específico para definir a meta."
                ) : metaAtual === 0 ? (
                  "Defina uma meta para acompanhar o progresso."
                ) : atingida ? (
                  <span className="text-primary font-medium">
                    ✓ Meta atingida — {formatBRL(faturadoDoAno)} de {formatBRL(metaAtual)}
                  </span>
                ) : (
                  <>
                    Faturado <strong>{formatBRL(faturadoDoAno)}</strong> de{" "}
                    <strong>{formatBRL(metaAtual)}</strong> —{" "}
                    {Math.round(pctMeta)}% da meta · faltam{" "}
                    <strong>{formatBRL(faltaMeta)}</strong>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barras mês a mês */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Faturamento mês a mês</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Faturado (sólido) e futuro (50% transparência) ao longo do ano selecionado.
        </p>
        {ano === "Todos" ? (
          <div className="text-xs text-muted-foreground">
            Selecione um ano específico para visualizar o gráfico mensal.
          </div>
        ) : (
          <div className="flex h-56 items-end gap-2 overflow-x-auto pt-4">
            {monthly.map((m, i) => {
              const totalMes = m.fat + m.fut;
              const h = (v: number) => (v / maxMonthly) * 180;
              return (
                <div key={i} className="flex h-full flex-1 min-w-[44px] flex-col items-center justify-end gap-1">
                  <div className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
                    {totalMes > 0 ? formatBRL(totalMes) : ""}
                  </div>
                  <div className="flex w-full max-w-[40px] flex-col-reverse overflow-hidden rounded-t">
                    {m.fat > 0 && (
                      <div style={{ height: `${h(m.fat)}px`, background: "#185FA5" }} />
                    )}
                    {m.fut > 0 && (
                      <div style={{ height: `${h(m.fut)}px`, background: "#185FA5", opacity: 0.5 }} />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground">{MESES_PT[i]}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detalhamento */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Detalhamento</h2>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Itens que compõem os valores acima, conforme os filtros selecionados.
        </p>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Box label="Faturado (expedido)" value={faturado} color="text-success" />
          {mostrarFuturo && (
            <Box label="Faturamento futuro" value={futuro} color="text-warning-foreground" />
          )}
          <Box label="Total do filtro" value={total} color="text-primary" />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Projeto</th>
                <th className="px-3 py-2 font-medium">Equipamento</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 text-right font-medium">Qtd</th>
                <th className="px-3 py-2 text-right font-medium">Valor Un</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                <th className="px-3 py-2 font-medium">Data Embarque</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {itensConsiderados.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhum item para os filtros selecionados.
                  </td>
                </tr>
              )}
              {itensConsiderados.map((e) => {
                const futuroRow = e.status_embarque !== "Expedido";
                return (
                  <tr
                    key={e.id}
                    className="border-t"
                    style={{ opacity: futuroRow ? 0.5 : 1 }}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{e.project?.name}</div>
                      <div className="text-[11px] text-muted-foreground">{e.project?.client}</div>
                    </td>
                    <td className="px-3 py-2 max-w-[320px]">
                      <div className="line-clamp-2">{e.equipamento}</div>
                    </td>
                    <td className="px-3 py-2"><TipoBadge value={e.tipo} /></td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.quantidade}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatBRL(e.valor_unitario)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatBRL(subtotal(e))}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.data_embarque)}</td>
                    <td className="px-3 py-2"><EmbarqueBadge value={e.status_embarque} /></td>
                    <td className="px-3 py-2">
                      <span className={`pill ${futuroRow ? "bg-warning/20 text-warning-foreground" : "bg-success/15 text-success"}`}>
                        {futuroRow ? "Futuro" : "Faturado"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {itensConsiderados.length > 0 && (
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="px-3 py-2" colSpan={5}>Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatBRL(total)}</td>
                  <td colSpan={3}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FiltroSelect({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[160px] rounded-md border bg-background px-2 text-sm"
      >
        {children}
      </select>
    </div>
  );
}

function Box({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{formatBRL(value)}</div>
    </div>
  );
}

function PieChart({
  slices, total,
}: {
  slices: { label: string; value: number; color: string; opacity: number }[];
  total: number;
}) {
  const size = 200;
  const r = 90;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0 || slices.length === 0) {
    return (
      <div
        className="flex h-[200px] w-[200px] items-center justify-center rounded-full bg-muted/40 text-xs text-muted-foreground"
      >
        Sem dados
      </div>
    );
  }

  let acc = 0;
  const paths = slices.map((s, i) => {
    const frac = s.value / total;
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const a1 = acc * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    if (frac >= 0.999) {
      // single full circle
      return (
        <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} fillOpacity={s.opacity} />
      );
    }
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const d = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    return <path key={i} d={d} fill={s.color} fillOpacity={s.opacity} />;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
    </svg>
  );
}
