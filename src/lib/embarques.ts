export type StatusProducao = "OK" | "NOK";
export type StatusEmbarque = "Não expedido" | "Expedido" | "Cancelado";

export interface Project {
  id: string;
  name: string;
  client: string;
}

export interface Equipment {
  id: string;
  project_id: string;
  equipamento: string;
  posicao: string;
  valor_unitario: number;
  quantidade: number;
  data_producao: string | null;
  status_producao: StatusProducao;
  data_embarque: string | null;
  status_embarque: StatusEmbarque;
}

export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
