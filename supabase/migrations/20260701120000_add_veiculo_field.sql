-- Adiciona campo veiculo (texto livre, nullable) para Material TRT
ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS veiculo TEXT;
