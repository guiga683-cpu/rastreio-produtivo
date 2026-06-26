import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface MultiSelectProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
  allLabel?: string;
}

export function MultiSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
  allLabel = "Todos",
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: T) {
    const next = new Set(selected);
    if (next.has(value)) {
      if (next.size === 1) return;
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(next);
  }

  const allSelected = selected.size === options.length;
  function toggleAll() {
    if (allSelected) {
      onChange(new Set([options[0].value]));
    } else {
      onChange(new Set(options.map((o) => o.value)));
    }
  }

  const displayLabel = allSelected
    ? allLabel
    : Array.from(selected)
        .map((v) => options.find((o) => o.value === v)?.label ?? v)
        .join(", ");

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 min-w-[140px] max-w-[220px] items-center justify-between gap-2 rounded-md border bg-background px-3 text-xs hover:bg-accent"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </div>
      {open && (
        <div className="absolute top-full z-50 mt-1 min-w-full rounded-md border bg-card shadow-md">
          <label className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-xs hover:bg-accent">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-3.5 w-3.5"
            />
            <span className="font-medium">{allLabel}</span>
          </label>
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={selected.has(o.value)}
                onChange={() => toggle(o.value)}
                className="h-3.5 w-3.5"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
