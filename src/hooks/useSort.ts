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
            columnTypes[c.key] ?? "string",
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

function compareValues(a: unknown, b: unknown, type: SortColumnType): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1; // nulos sempre ao final, independente da direção
  if (bNull) return -1;

  if (type === "number") {
    return Number(a) - Number(b);
  }
  if (type === "date") {
    return new Date(String(a)).getTime() - new Date(String(b)).getTime();
  }
  return String(a).localeCompare(String(b), "pt-BR");
}
