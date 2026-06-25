export type StatusProducao = "OK" | "NOK";
export type StatusEmbarque = "Não expedido" | "Expedido" | "Cancelado";
export type TipoItem = "Equipamento" | "Material" | "Material TRT";

export interface Project {
  id: string;
  name: string;
  client: string;
}

export interface Equipment {
  id: string;
  project_id: string;
  equipamento: string;
  posicao: string | null;
  valor_unitario: number;
  quantidade: number;
  data_producao: string | null;
  status_producao: StatusProducao | null;
  data_embarque: string | null;
  status_embarque: StatusEmbarque;
  tipo: TipoItem;
  data_faturamento: string | null;
  frete: "CIF" | "FOB" | null;
  peso: number | null;
  volume: number | null;
  observacao: string | null;
}

export function isTipoMaterial(tipo: TipoItem): boolean {
  return tipo === "Material" || tipo === "Material TRT";
}

const _brl = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata em "R$ 185 000,00" (espaço como separador de milhar, vírgula nos decimais). */
export function formatBRL(value: number | string | null | undefined): string {
  const n = Number(value ?? 0) || 0;
  // pt-BR usa ponto como milhar e vírgula nos decimais; trocamos o ponto por espaço.
  return "R$ " + _brl.format(n).replace(/\./g, " ");
}

/** Compat: alguns lugares ainda usam BRL.format(...) */
export const BRL = { format: (n: number) => formatBRL(n) };

export function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

export function isLate(e: Equipment, today = todayISO()): boolean {
  return e.status_embarque === "Não expedido" && !!e.data_embarque && e.data_embarque < today;
}

export function isNext30(e: Equipment, today = todayISO()): boolean {
  if (e.status_embarque !== "Não expedido" || !e.data_embarque) return false;
  const d = daysBetween(today, e.data_embarque);
  return d >= 0 && d <= 30;
}

export function isToday(e: Equipment, today = todayISO()): boolean {
  return e.status_embarque === "Não expedido" && e.data_embarque === today;
}

export function subtotal(e: Pick<Equipment, "valor_unitario" | "quantidade">): number {
  return Number(e.valor_unitario || 0) * Number(e.quantidade || 0);
}

export const MESES_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
