import { useCallback, useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortColumnType = "string" | "number" | "date";

export interface SortCriteria {
  key: string;
  direction: SortDirection;
  priority: number;
}

export function useSort<T>(columnTypes: Record<string, SortColumnType> = {}) {
  const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>([]);

  const handleSort = useCallback((key: string, isShift: boolean) => {
    setSortCriteria((prev) => {
      const existing = prev.find((c) => c.key === key);

      if (!isShift) {
        if (!existing) return [{ key, direction: "asc", priority: 1 }];
        if (existing.direction === "asc") return [{ key, direction: "desc", priority: 1 }];
        return [];
      }

      if (!existing) {
        return [...prev, { key, direction: "asc", priority: prev.length + 1 }];
      }
      if (existing.direction === "asc") {
        return prev.map((c) => (c.key === key ? { ...c, direction: "desc" } : c));
      }
      return prev.filter((c) => c.key !== key).map((c, i) => ({ ...c, priority: i + 1 }));
    });
  }, []);

  const sortData = useCallback(
    (rows: T[]): T[] => {
      if (sortCriteria.length === 0) return rows;
      const ordered = [...sortCriteria].sort((a, b) => a.priority - b.priority);
      return [...rows].sort((a, b) => {
        for (const c of ordered) {
          const cmp = compareValues(
            (a as Record<string, unknown>)[c.key],
            (b as Record<string, unknown>)[c.key],
            columnTypes[c.key],
          );
          if (cmp !== 0) return c.direction === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    },
    [sortCriteria, columnTypes],
  );

  return { sortCriteria, handleSort, sortData };
}

const isNumeric = (val: unknown): boolean =>
  val !== null && val !== undefined && val !== "" && !Number.isNaN(Number(val));

const isDateString = (val: unknown): boolean =>
  typeof val === "string" && !Number.isNaN(Date.parse(val));

const toDate = (val: unknown): number | null => (val ? new Date(val as string).getTime() : null);

/** Resolve o tipo de comparação: respeita a dica explícita; senão detecta a partir dos valores. */
function resolveType(a: unknown, b: unknown, hint?: SortColumnType): SortColumnType {
  if (hint) return hint;
  if (isDateString(a) && isDateString(b)) return "date";
  if (isNumeric(a) && isNumeric(b)) return "number";
  return "string";
}

function compareValues(a: unknown, b: unknown, hint?: SortColumnType): number {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // nulos/vazios sempre ao final, independente da direção
  if (bEmpty) return -1;

  const type = resolveType(a, b, hint);

  if (type === "date") {
    return (toDate(a) ?? 0) - (toDate(b) ?? 0);
  }
  if (type === "number") {
    return Number(a) - Number(b);
  }
  return String(a).localeCompare(String(b), "pt-BR");
}
