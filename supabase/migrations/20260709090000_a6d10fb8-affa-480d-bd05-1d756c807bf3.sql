-- Checklist de custo e fluxo, aplicável a qualquer tipo de item
ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS custo TEXT NOT NULL DEFAULT 'NOK' CHECK (custo IN ('OK', 'NOK')),
  ADD COLUMN IF NOT EXISTS fluxo TEXT NOT NULL DEFAULT 'NOK' CHECK (fluxo IN ('OK', 'NOK'));
