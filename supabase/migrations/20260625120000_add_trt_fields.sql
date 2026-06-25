
-- Novas colunas para Material TRT e Data Faturamento
ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS data_faturamento DATE,
  ADD COLUMN IF NOT EXISTS frete TEXT CHECK (frete IN ('CIF', 'FOB')),
  ADD COLUMN IF NOT EXISTS peso NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS volume NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS observacao TEXT;

-- Permitir NULL em posicao e status_producao (necessário para Material TRT)
ALTER TABLE public.equipments ALTER COLUMN posicao DROP NOT NULL;
ALTER TABLE public.equipments ALTER COLUMN status_producao DROP NOT NULL;
