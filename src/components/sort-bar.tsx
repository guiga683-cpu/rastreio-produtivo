import { ArrowDown, ArrowUp } from "lucide-react";
import type { SortDir, SortKeyDef } from "@/hooks/useSortedRows";

interface SortBarProps<K extends string, T> {
  keys: Record<K, SortKeyDef<T>>;
  sortKey: K;
  sortDir: SortDir;
  setSort: (k: K) => void;
}

export function SortBar<K extends string, T>({ keys, sortKey, sortDir, setSort }: SortBarProps<K, T>) {
  const order = Object.keys(keys) as K[];
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
      <span className="mr-1 text-muted-foreground">Ordenar por:</span>
      {order.map((k) => {
        const active = k === sortKey;
        return (
          <button
            key={k}
            type="button"
            onClick={() => setSort(k)}
            className={
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors " +
              (active
                ? "border-primary bg-accent text-foreground"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            {keys[k].label}
            {active &&
              (sortDir === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              ))}
          </button>
        );
      })}
    </div>
  );
}
