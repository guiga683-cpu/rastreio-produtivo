import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Carga } from "@/lib/embarques";
import { formatBRL, sumCargas } from "@/lib/embarques";

type CargaPatch = Partial<Pick<Carga, "descricao" | "valor" | "peso" | "volume" | "veiculo">>;

interface Props {
  cargas: Carga[];
  onAdd: () => void;
  onUpdate: (id: string, patch: CargaPatch) => void;
  onRemove: (id: string) => void;
}

const GRID = "grid grid-cols-[1fr_120px_100px_100px_140px_28px] items-center gap-1.5";

export function CargasEditor({ cargas, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="space-y-2 rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Cargas</span>
        <span className="text-xs font-medium">
          Total: <span className="tabular-nums">{formatBRL(sumCargas(cargas))}</span>
        </span>
      </div>

      {cargas.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nenhuma carga cadastrada.</div>
      ) : (
        <div className="space-y-1.5">
          <div className={`${GRID} px-0.5 text-[11px] font-medium text-muted-foreground`}>
            <span>Descrição</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Peso</span>
            <span className="text-right">Volume</span>
            <span>Veículo</span>
            <span />
          </div>
          {cargas.map((c) => (
            <CargaRow key={c.id} carga={c} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3 w-3" /> Nova carga
      </button>
    </div>
  );
}

function CargaRow({
  carga,
  onUpdate,
  onRemove,
}: {
  carga: Carga;
  onUpdate: Props["onUpdate"];
  onRemove: Props["onRemove"];
}) {
  const [descricao, setDescricao] = useState(carga.descricao);
  const [valor, setValor] = useState(String(carga.valor ?? 0));
  const [peso, setPeso] = useState(carga.peso != null ? String(carga.peso) : "");
  const [volume, setVolume] = useState(carga.volume != null ? String(carga.volume) : "");
  const [veiculo, setVeiculo] = useState(carga.veiculo ?? "");

  useEffect(() => {
    setDescricao(carga.descricao);
    setValor(String(carga.valor ?? 0));
    setPeso(carga.peso != null ? String(carga.peso) : "");
    setVolume(carga.volume != null ? String(carga.volume) : "");
    setVeiculo(carga.veiculo ?? "");
  }, [carga]);

  return (
    <div className={GRID}>
      <input
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        onBlur={() => descricao !== carga.descricao && onUpdate(carga.id, { descricao })}
        placeholder="Descrição"
        className="rounded border bg-background px-2 py-1 text-xs"
      />
      <input
        type="number"
        step="0.01"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          const n = Number(valor) || 0;
          if (n !== Number(carga.valor)) onUpdate(carga.id, { valor: n });
        }}
        placeholder="Valor"
        className="rounded border bg-background px-2 py-1 text-right text-xs"
      />
      <input
        type="number"
        step="0.01"
        value={peso}
        onChange={(e) => setPeso(e.target.value)}
        onBlur={() => {
          const n = peso === "" ? null : Number(peso);
          if (n !== carga.peso) onUpdate(carga.id, { peso: n });
        }}
        placeholder="Peso"
        className="rounded border bg-background px-2 py-1 text-right text-xs"
      />
      <input
        type="number"
        step="0.01"
        value={volume}
        onChange={(e) => setVolume(e.target.value)}
        onBlur={() => {
          const n = volume === "" ? null : Number(volume);
          if (n !== carga.volume) onUpdate(carga.id, { volume: n });
        }}
        placeholder="Volume"
        className="rounded border bg-background px-2 py-1 text-right text-xs"
      />
      <input
        value={veiculo}
        onChange={(e) => setVeiculo(e.target.value)}
        onBlur={() => {
          const v = veiculo || null;
          if (v !== carga.veiculo) onUpdate(carga.id, { veiculo: v });
        }}
        placeholder="Veículo"
        className="rounded border bg-background px-2 py-1 text-xs"
      />
      <button
        type="button"
        onClick={() => onRemove(carga.id)}
        className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
        title="Remover carga"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
