import type { Equipment, StatusEmbarque, StatusProducao, TipoItem } from "@/lib/embarques";
import { isTipoMaterial } from "@/lib/embarques";
import { Trash2, Plus } from "lucide-react";

export type DraftEquip = Omit<Equipment, "id" | "project_id"> & { id?: string };

interface Props {
  rows: DraftEquip[];
  onChange: (rows: DraftEquip[]) => void;
}

export function emptyRow(): DraftEquip {
  return {
    equipamento: "",
    posicao: "",
    valor_unitario: 0,
    quantidade: 1,
    data_producao: null,
    status_producao: "NOK",
    data_embarque: null,
    status_embarque: "Não expedido",
    tipo: "Equipamento",
    data_faturamento: null,
    frete: null,
    peso: null,
    volume: null,
    observacao: null,
  };
}

export function EquipEditor({ rows, onChange }: Props) {
  function update(i: number, patch: Partial<DraftEquip>) {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  function updateTipo(i: number, newTipo: TipoItem) {
    const patch: Partial<DraftEquip> = { tipo: newTipo };
    if (isTipoMaterial(newTipo)) {
      // Material e Material TRT não usam posição/produção
      patch.posicao = null;
      patch.data_producao = null;
      patch.status_producao = null;
    } else if (rows[i].status_producao === null) {
      // Voltando para Equipamento: restaura status de produção
      patch.status_producao = "NOK";
    }
    if (newTipo !== "Material TRT") {
      // Apenas Material TRT usa campos de logística
      patch.frete = null;
      patch.peso = null;
      patch.volume = null;
      patch.observacao = null;
    }
    update(i, patch);
  }

  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...rows, emptyRow()]);
  }

  const isMaterial = (r: DraftEquip) => isTipoMaterial(r.tipo);
  const isTrt = (r: DraftEquip) => r.tipo === "Material TRT";

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr className="text-left">
              <th className="px-2 py-2 font-medium min-w-[280px]">Equipamento</th>
              <th className="px-2 py-2 font-medium">Tipo</th>
              <th className="px-2 py-2 font-medium">Posição</th>
              <th className="px-2 py-2 font-medium">Valor</th>
              <th className="px-2 py-2 font-medium">Qtd</th>
              <th className="px-2 py-2 font-medium">Data Prod.</th>
              <th className="px-2 py-2 font-medium">Status Prod.</th>
              <th className="px-2 py-2 font-medium">Data Faturamento</th>
              <th className="px-2 py-2 font-medium">Data Embarque</th>
              <th className="px-2 py-2 font-medium">Status Embarque</th>
              <th className="px-2 py-2 font-medium">Frete</th>
              <th className="px-2 py-2 font-medium">Peso</th>
              <th className="px-2 py-2 font-medium">Volume</th>
              <th className="px-2 py-2 font-medium">Obs</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t align-top">
                <td className="px-2 py-1.5">
                  <textarea
                    rows={2}
                    value={r.equipamento}
                    onChange={(e) => update(i, { equipamento: e.target.value })}
                    className="w-full resize-y rounded border bg-background px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={r.tipo}
                    onChange={(e) => updateTipo(i, e.target.value as TipoItem)}
                    className="rounded border bg-background px-2 py-1 text-xs"
                  >
                    <option>Equipamento</option>
                    <option>Material</option>
                    <option>Material TRT</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  {isMaterial(r) ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <input
                      value={r.posicao ?? ""}
                      onChange={(e) => update(i, { posicao: e.target.value })}
                      className="w-24 rounded border bg-background px-2 py-1 text-xs"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {isMaterial(r) ? (
                    <input
                      type="number"
                      disabled
                      value={r.valor_unitario}
                      className="w-28 cursor-not-allowed rounded border bg-muted px-2 py-1 text-right text-xs opacity-60"
                    />
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      value={r.valor_unitario}
                      onChange={(e) => update(i, { valor_unitario: Number(e.target.value) })}
                      className="w-28 rounded border bg-background px-2 py-1 text-right text-xs"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={1}
                    value={r.quantidade}
                    onChange={(e) => update(i, { quantidade: Number(e.target.value) })}
                    className="w-16 rounded border bg-background px-2 py-1 text-right text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {isMaterial(r) ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <input
                      type="date"
                      value={r.data_producao ?? ""}
                      onChange={(e) => update(i, { data_producao: e.target.value || null })}
                      className="rounded border bg-background px-2 py-1 text-xs"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {isMaterial(r) ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <select
                      value={r.status_producao ?? "NOK"}
                      onChange={(e) =>
                        update(i, { status_producao: e.target.value as StatusProducao })
                      }
                      className="rounded border bg-background px-2 py-1 text-xs"
                    >
                      <option value="OK">OK</option>
                      <option value="NOK">NOK</option>
                    </select>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    value={r.data_faturamento ?? ""}
                    onChange={(e) => update(i, { data_faturamento: e.target.value || null })}
                    className="rounded border bg-background px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    value={r.data_embarque ?? ""}
                    onChange={(e) => update(i, { data_embarque: e.target.value || null })}
                    className="rounded border bg-background px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={r.status_embarque}
                    onChange={(e) =>
                      update(i, { status_embarque: e.target.value as StatusEmbarque })
                    }
                    className="rounded border bg-background px-2 py-1 text-xs"
                  >
                    <option>Não expedido</option>
                    <option>Expedido</option>
                    <option>Cancelado</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  {isTrt(r) ? (
                    <select
                      value={r.frete ?? ""}
                      onChange={(e) =>
                        update(i, { frete: (e.target.value || null) as DraftEquip["frete"] })
                      }
                      className="rounded border bg-background px-2 py-1 text-xs"
                    >
                      <option value="">—</option>
                      <option value="CIF">CIF</option>
                      <option value="FOB">FOB</option>
                    </select>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {isTrt(r) ? (
                    <input
                      type="number"
                      step="0.01"
                      value={r.peso ?? ""}
                      onChange={(e) =>
                        update(i, { peso: e.target.value ? Number(e.target.value) : null })
                      }
                      className="w-20 rounded border bg-background px-2 py-1 text-right text-xs"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {isTrt(r) ? (
                    <input
                      type="number"
                      step="0.01"
                      value={r.volume ?? ""}
                      onChange={(e) =>
                        update(i, { volume: e.target.value ? Number(e.target.value) : null })
                      }
                      className="w-20 rounded border bg-background px-2 py-1 text-right text-xs"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {isTrt(r) ? (
                    <textarea
                      rows={2}
                      value={r.observacao ?? ""}
                      onChange={(e) => update(i, { observacao: e.target.value || null })}
                      className="w-32 resize-y rounded border bg-background px-2 py-1 text-xs"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={15} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Sem equipamentos. Adicione uma linha.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 rounded-md border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Nova linha
      </button>
    </div>
  );
}
