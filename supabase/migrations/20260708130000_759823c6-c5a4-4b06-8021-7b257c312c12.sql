-- Checklist de romaneio e painel, aplicável a qualquer tipo de item
ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS romaneio TEXT NOT NULL DEFAULT 'NOK' CHECK (romaneio IN ('OK', 'NOK')),
  ADD COLUMN IF NOT EXISTS painel TEXT NOT NULL DEFAULT 'NOK' CHECK (painel IN ('OK', 'NOK'));
