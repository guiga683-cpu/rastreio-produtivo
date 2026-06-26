import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import {
  type Equipment,
  type Project,
  type TipoItem,
  formatBRL,
  formatDate,
  isTipoMaterial,
  subtotal,
  MESES_PT,
} from "@/lib/embarques";
import { TipoBadge, EmbarqueBadge } from "@/components/badges";
import { MultiSelect } from "@/components/multi-select";

export const Route = createFileRoute("/_authenticated/faturamento")({
  head: () => ({ meta: [{ title: "Faturamento — Embarques" }] }),
  component: FaturamentoPage,
});

type FatRow = Equipment & { project?: Project };

function toExcelDate(dateStr: string | null): number | "" {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  const excelEpoch = new Date(1899, 11, 30);
  return Math.round((date.getTime() - excelEpoch.getTime()) / 86400000);
}

function formatDateCols(ws: XLSX.WorkSheet, cols: string[], rowCount: number) {
  const fmt = "dd/mm/yyyy";
  for (const col of cols) {
    for (let row = 2; row <= rowCount + 1; row++) {
      const ref = `${col}${row}`;
      const cell = ws[ref];
      if (cell && cell.v !== "") {
        cell.t = "n";
        cell.z = fmt;
      }
    }
  }
}

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

  const projects = useMemo(() => data?.projects ?? [], [data]);
  const equipments = useMemo(() => data?.equipments ?? [], [data]);
  const metas = data?.metas ?? [];

  const pById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const anosDisponiveis = useMemo(() => {
    const s = new Set<number>();
    equipments.forEach((e) => {
      if (e.data_embarque && e.status_embarque !== "Cancelado")
        s.add(Number(e.data_embarque.slice(0, 4)));
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [equipments]);

  const [anosFiltro, setAnosFiltro] = useState<Set<string>>(new Set());
  const [projetosFiltro, setProjetosFiltro] = useState<Set<string>>(new Set());
  const [mesesFiltro, setMesesFiltro] = useState<Set<string>>(new Set());
  const [tiposFiltro, setTiposFiltro] = useState<Set<TipoItem>>(
    new Set(["Equipamento", "Material", "Material TRT"]),
  );
  const [mostrarFuturo, setMostrarFuturo] = useState(false);

  const baseItens = useMemo<FatRow[]>(() => {
    return equipments
      .filter((e) => e.status_embarque !== "Cancelado" && e.data_embarque)
      .map((e) => ({ ...e, project: pById.get(e.project_id) }));
  }, [equipments, pById]);

  const aplicarFiltrosBase = (item: FatRow) => {
    if (
      anosFiltro.size > 0 &&
      item.data_embarque &&
      !anosFiltro.has(item.data_embarque.slice(0, 4))
    )
      return false;
    if (projetosFiltro.size > 0 && !projetosFiltro.has(item.project_id)) return false;
    if (!tiposFiltro.has(item.tipo)) return false;
    return true;
  };

  const mesesDisponiveis = useMemo(() => {
    const s = new Set<number>();
    baseItens.filter(aplicarFiltrosBase).forEach((e) => {
      s.add(Number(e.data_embarque!.slice(5, 7)));
    });
    return Array.from(s).sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItens, anosFiltro, projetosFiltro, tiposFiltro]);

  useEffect(() => {
    if (anosDisponiveis.length > 0 && anosFiltro.size === 0) {
      setAnosFiltro(new Set(anosDisponiveis.map(String)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anosDisponiveis]);

  useEffect(() => {
    if (projects.length > 0 && projetosFiltro.size === 0) {
      setProjetosFiltro(new Set(projects.map((p) => p.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  useEffect(() => {
    if (mesesDisponiveis.length > 0) {
      setMesesFiltro(new Set(mesesDisponiveis.map((m) => String(m).padStart(2, "0"))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anosDisponiveis]);

  const itensFiltrados = useMemo<FatRow[]>(() => {
    return baseItens.filter((e) => {
      if (!aplicarFiltrosBase(e)) return false;
      if (mesesFiltro.size > 0 && e.data_embarque && !mesesFiltro.has(e.data_embarque.slice(5, 7)))
        return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItens, anosFiltro, projetosFiltro, tiposFiltro, mesesFiltro]);

  const itensConsiderados = mostrarFuturo
    ? itensFiltrados
    : itensFiltrados.filter((e) => e.status_embarque === "Expedido");

  const tot = (items: FatRow[]) => items.reduce((s, i) => s + subtotal(i), 0);
  const faturado = tot(itensFiltrados.filter((e) => e.status_embarque === "Expedido"));
  const futuro = tot(itensFiltrados.filter((e) => e.status_embarque === "Não expedido"));
  const total = mostrarFuturo ? faturado + futuro : faturado;

  const slices = useMemo(() => {
    const fEq = tot(
      itensFiltrados.filter((e) => e.status_embarque === "Expedido" && e.tipo === "Equipamento"),
    );
    const fMa = tot(
      itensFiltrados.filter((e) => e.status_embarque === "Expedido" && e.tipo === "Material"),
    );
    const fTrt = tot(
      itensFiltrados.filter((e) => e.status_embarque === "Expedido" && e.tipo === "Material TRT"),
    );
    const xEq = tot(
      itensFiltrados.filter(
        (e) => e.status_embarque === "Não expedido" && e.tipo === "Equipamento",
      ),
    );
    const xMa = tot(
      itensFiltrados.filter((e) => e.status_embarque === "Não expedido" && e.tipo === "Material"),
    );
    const xTrt = tot(
      itensFiltrados.filter(
        (e) => e.status_embarque === "Não expedido" && e.tipo === "Material TRT",
      ),
    );
    const arr = [
      { label: "Equipamento — Faturado", value: fEq, color: "#185FA5", opacity: 1 },
      { label: "Material — Faturado", value: fMa, color: "#D97706", opacity: 1 },
      { label: "Material TRT — Faturado", value: fTrt, color: "#7C3AED", opacity: 1 },
    ];
    if (mostrarFuturo) {
      arr.push(
        { label: "Equipamento — Futuro", value: xEq, color: "#185FA5", opacity: 0.5 },
        { label: "Material — Futuro", value: xMa, color: "#D97706", opacity: 0.5 },
        { label: "Material TRT — Futuro", value: xTrt, color: "#7C3AED", opacity: 0.5 },
      );
    }
    return arr.filter((s) => s.value > 0);
  }, [itensFiltrados, mostrarFuturo]);

  const singleAno = anosFiltro.size === 1 ? Array.from(anosFiltro)[0] : null;

  const monthly = useMemo(() => {
    const arr = MESES_PT.map(() => ({ fat: 0, fut: 0 }));
    if (!singleAno) return arr;
    itensFiltrados.forEach((e) => {
      if (e.data_embarque!.slice(0, 4) !== singleAno) return;
      const m = Number(e.data_embarque!.slice(5, 7)) - 1;
      const v = subtotal(e);
      if (e.status_embarque === "Expedido") arr[m].fat += v;
      else if (mostrarFuturo) arr[m].fut += v;
    });
    return arr;
  }, [itensFiltrados, singleAno, mostrarFuturo]);
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.fat + m.fut));

  const metaAtual = singleAno ? (metas.find((m) => m.ano === Number(singleAno))?.valor ?? 0) : 0;
  const [metaInput, setMetaInput] = useState<string>("");
  useEffect(() => {
    setMetaInput(metaAtual ? String(metaAtual) : "");
  }, [singleAno, metaAtual]);

  async function salvarMeta() {
    if (!singleAno) return;
    const v = Number(metaInput) || 0;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("metas_faturamento")
      .upsert({ user_id: u.user.id, ano: Number(singleAno), valor: v }, { onConflict: "ano" });
    if (error) alert(error.message);
    else qc.invalidateQueries({ queryKey: ["fat-data"] });
  }

  const faturadoDoAno = useMemo(() => {
    if (!singleAno) return 0;
    return baseItens
      .filter((e) => e.status_embarque === "Expedido" && e.data_embarque!.slice(0, 4) === singleAno)
      .reduce((s, i) => s + subtotal(i), 0);
  }, [baseItens, singleAno]);

  const pctMeta = metaAtual > 0 ? Math.min(100, (faturadoDoAno / metaAtual) * 100) : 0;
  const faltaMeta = Math.max(0, metaAtual - faturadoDoAno);
  const atingida = metaAtual > 0 && faturadoDoAno >= metaAtual;

  const semValor = equipments.filter(
    (e) =>
      e.status_embarque === "Expedido" && (!e.valor_unitario || Number(e.valor_unitario) === 0),
  );

  function exportXLSX() {
    const wb = XLSX.utils.book_new();
    const equipRows = itensConsiderados.filter((e) => e.tipo === "Equipamento");
    const matRows = itensConsiderados.filter((e) => isTipoMaterial(e.tipo));

    function autoWidth(rows: Record<string, unknown>[]) {
      if (rows.length === 0) return [];
      const keys = Object.keys(rows[0]);
      return keys.map((k) => ({
        wch: Math.min(50, Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2),
      }));
    }

    const equipData = equipRows.map((e) => ({
      Projeto: e.project?.name ?? "",
      Cliente: e.project?.client ?? "",
      Equipamento: e.equipamento,
      Tipo: e.tipo,
      Posição: e.posicao ?? "",
      Qtd: e.quantidade,
      "Valor Unitário": Number(e.valor_unitario),
      Subtotal: subtotal(e),
      "Data Faturamento": toExcelDate(e.data_faturamento),
      "Data Embarque": toExcelDate(e.data_embarque),
      Status: e.status_embarque,
      Situação: e.status_embarque === "Expedido" ? "Faturado" : "Futuro",
    }));
    const matData = matRows.map((e) => ({
      Projeto: e.project?.name ?? "",
      Cliente: e.project?.client ?? "",
      Descrição: e.equipamento,
      Tipo: e.tipo,
      Qtd: e.quantidade,
      "Valor Unitário": Number(e.valor_unitario),
      Subtotal: subtotal(e),
      "Data Faturamento": toExcelDate(e.data_faturamento),
      "Data Embarque": toExcelDate(e.data_embarque),
      Frete: e.frete ?? "",
      "Peso (kg)": e.peso ?? "",
      "Volume (m³)": e.volume ?? "",
      Observação: e.observacao ?? "",
      Status: e.status_embarque,
      Situação: e.status_embarque === "Expedido" ? "Faturado" : "Futuro",
    }));

    const wsE = XLSX.utils.json_to_sheet(equipData);
    wsE["!cols"] = autoWidth(equipData);
    formatDateCols(wsE, ["I", "J"], equipData.length);
    XLSX.utils.book_append_sheet(wb, wsE, "Equipamentos");

    const wsM = XLSX.utils.json_to_sheet(matData);
    wsM["!cols"] = autoWidth(matData);
    formatDateCols(wsM, ["H", "I"], matData.length);
    XLSX.utils.book_append_sheet(wb, wsM, "Materiais");

    const anoLabel =
      anosFiltro.size === anosDisponiveis.length || anosFiltro.size === 0
        ? "todos"
        : Array.from(anosFiltro).sort().join("-");
    const mesLabel =
      mesesFiltro.size === 12 || mesesFiltro.size === 0
        ? "todos"
        : Array.from(mesesFiltro).sort().join("-");
    XLSX.writeFile(wb, `faturamento_${anoLabel}_${mesLabel}.xlsx`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Faturamento</h1>
        <p className="text-sm text-muted-foreground">
          Faturado = itens <strong>Expedido</strong>. Futuro = ainda não expedidos (sempre exibidos
          com 50% de transparência). Itens cancelados ficam de fora.
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {semValor.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-xs text-warning-foreground">
          <AlertTriangle className="h-4 w-4" />
          {semValor.length} item(s) com status <strong>Expedido</strong> estão sem valor unitário —
          o faturamento pode estar subestimado.
        </div>
      )}

      {/* Filtros + Pizza */}
      <div className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <MultiSelect
            label="Ano"
            options={anosDisponiveis.map((a) => ({ value: String(a), label: String(a) }))}
            selected={anosFiltro}
            onChange={setAnosFiltro}
            allLabel="Todos os anos"
          />
          <MultiSelect
            label="Projeto"
            options={projects.map((p) => ({ value: p.id, label: p.client }))}
            selected={projetosFiltro}
            onChange={setProjetosFiltro}
            allLabel="Todos os projetos"
          />
          <MultiSelect
            label="Mês"
            options={MESES_PT.map((m, i) => ({
              value: String(i + 1).padStart(2, "0"),
              label: m,
            }))}
            selected={mesesFiltro}
            onChange={setMesesFiltro}
            allLabel="Todos os meses"
          />
          <MultiSelect<TipoItem>
            label="Tipo"
            options={[
              { value: "Equipamento", label: "Equipamento" },
              { value: "Material", label: "Material" },
              { value: "Material TRT", label: "Material TRT" },
            ]}
            selected={tiposFiltro}
            onChange={setTiposFiltro}
            allLabel="Todos os tipos"
          />
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
          <div className="min-w-[240px] flex-1 space-y-2">
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
                Meta de faturamento ({singleAno ?? "ano"})
              </label>
              <input
                type="number"
                value={metaInput}
                onChange={(e) => setMetaInput(e.target.value)}
                onBlur={salvarMeta}
                disabled={!singleAno}
                placeholder="0"
                className="w-48 rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
              />
            </div>
            <div className="min-w-[240px] flex-1">
              <div className="h-5 overflow-hidden rounded-full border bg-muted">
                <div
                  className={`h-full transition-all ${atingida ? "bg-primary" : "bg-success"}`}
                  style={{ width: `${pctMeta}%` }}
                />
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {!singleAno ? (
                  "Selecione um ano específico para definir a meta."
                ) : metaAtual === 0 ? (
                  "Defina uma meta para acompanhar o progresso."
                ) : atingida ? (
                  <span className="font-medium text-primary">
                    Meta atingida — {formatBRL(faturadoDoAno)} de {formatBRL(metaAtual)}
                  </span>
                ) : (
                  <>
                    Faturado <strong>{formatBRL(faturadoDoAno)}</strong> de{" "}
                    <strong>{formatBRL(metaAtual)}</strong> — {Math.round(pctMeta)}% da meta ·
                    faltam <strong>{formatBRL(faltaMeta)}</strong>
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
        {!singleAno ? (
          <div className="text-xs text-muted-foreground">
            Selecione um ano específico para visualizar o gráfico mensal.
          </div>
        ) : (
          <div className="flex h-56 items-end gap-2 overflow-x-auto pt-4">
            {monthly.map((m, i) => {
              const totalMes = m.fat + m.fut;
              const h = (v: number) => (v / maxMonthly) * 180;
              return (
                <div
                  key={i}
                  className="flex h-full min-w-[44px] flex-1 flex-col items-center justify-end gap-1"
                >
                  <div className="whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">
                    {totalMes > 0 ? formatBRL(totalMes) : ""}
                  </div>
                  <div className="flex w-full max-w-[40px] flex-col-reverse overflow-hidden rounded-t">
                    {m.fat > 0 && (
                      <div style={{ height: `${h(m.fat)}px`, background: "#185FA5" }} />
                    )}
                    {m.fut > 0 && (
                      <div
                        style={{ height: `${h(m.fut)}px`, background: "#185FA5", opacity: 0.5 }}
                      />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    {MESES_PT[i]}
                  </div>
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
            onClick={exportXLSX}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" /> Exportar XLSX
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
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap min-w-[110px]">
                  Valor Un
                </th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap min-w-[110px]">
                  Subtotal
                </th>
                <th className="px-3 py-2 font-medium">Data Embarque</th>
                <th className="px-3 py-2 font-medium">Data Fat.</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {itensConsiderados.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhum item para os filtros selecionados.
                  </td>
                </tr>
              )}
              {itensConsiderados.map((e) => {
                const futuroRow = e.status_embarque !== "Expedido";
                return (
                  <tr key={e.id} className="border-t" style={{ opacity: futuroRow ? 0.5 : 1 }}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{e.project?.name}</div>
                      <div className="text-[11px] text-muted-foreground">{e.project?.client}</div>
                    </td>
                    <td className="px-3 py-2 max-w-[320px]">
                      <div className="line-clamp-2">{e.equipamento}</div>
                    </td>
                    <td className="px-3 py-2">
                      <TipoBadge value={e.tipo} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.quantidade}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap min-w-[110px]">
                      {formatBRL(e.valor_unitario)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap min-w-[110px]">
                      {formatBRL(subtotal(e))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.data_embarque)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(e.data_faturamento)}
                    </td>
                    <td className="px-3 py-2">
                      <EmbarqueBadge value={e.status_embarque} />
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`pill ${futuroRow ? "bg-warning/20 text-warning-foreground" : "bg-success/15 text-success"}`}
                      >
                        {futuroRow ? "Futuro" : "Faturado"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {itensConsiderados.length > 0 && (
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="px-3 py-2" colSpan={5}>
                    Total
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatBRL(total)}</td>
                  <td colSpan={4}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
  slices,
  total,
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
      <div className="flex h-[200px] w-[200px] items-center justify-center rounded-full bg-muted/40 text-xs text-muted-foreground">
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
      return <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} fillOpacity={s.opacity} />;
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
