-- Campo de texto livre "Obs" (nota), independente do campo "Link" (observacao)
ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS nota TEXT;
