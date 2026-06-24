import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export interface SortKeyDef<T> {
  /** Valor para comparação. Retornar null/undefined manda para o fim. */
  get: (row: T) => number | string | null | undefined;
  /** Direção padrão ao selecionar este critério pela primeira vez. */
  defaultDir: SortDir;
  /** Rótulo exibido no botão. */
  label: string;
}

export function useSortedRows<T, K extends string>(
  rows: T[],
  keys: Record<K, SortKeyDef<T>>,
  initialKey: K,
) {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(keys[initialKey].defaultDir);

  function setSort(k: K) {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(keys[k].defaultDir);
    }
  }

  const sorted = useMemo(() => {
    const def = keys[sortKey];
    const dir = sortDir === "asc" ? 1 : -1;
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = def.get(a);
      const vb = def.get(b);
      const aNull = va === null || va === undefined || (typeof va === "number" && Number.isNaN(va));
      const bNull = vb === null || vb === undefined || (typeof vb === "number" && Number.isNaN(vb));
      if (aNull && bNull) return 0;
      if (aNull) return 1; // nulos sempre ao final
      if (bNull) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, setSort };
}
