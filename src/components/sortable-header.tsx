import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { SortCriteria } from "@/hooks/useSort";

interface SortableHeaderProps {
  column: string;
  label: string;
  sortCriteria: SortCriteria[];
  onSort: (key: string, isShift: boolean) => void;
}

export function SortableHeader({ column, label, sortCriteria, onSort }: SortableHeaderProps) {
  const criteria = sortCriteria.find((c) => c.key === column);
  const showPriority = sortCriteria.length > 1 && !!criteria;

  return (
    <button
      type="button"
      onClick={(e) => onSort(column, e.shiftKey)}
      title="Clique para ordenar · Shift+Clique para ordenação múltipla"
      className={
        "group inline-flex w-full select-none items-center gap-1 whitespace-nowrap text-left " +
        (criteria ? "font-semibold text-primary" : "")
      }
    >
      <span>{label}</span>
      {criteria ? (
        criteria.direction === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
      )}
      {showPriority && (
        <span className="text-[10px] font-semibold text-primary">{criteria!.priority}</span>
      )}
    </button>
  );
}
