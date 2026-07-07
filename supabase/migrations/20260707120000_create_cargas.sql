-- Desmembramento de itens Material TRT em cargas (múltiplas entregas/caminhões).
-- A soma de cargas.valor de um equipamento é refletida em equipments.valor_unitario
-- pela aplicação (Dashboard) — nenhuma coluna nova é criada em equipments.
CREATE TABLE public.cargas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  peso NUMERIC(14,2),
  volume NUMERIC(14,2),
  veiculo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cargas_equipment_idx ON public.cargas(equipment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargas TO authenticated;
GRANT ALL ON public.cargas TO service_role;

ALTER TABLE public.cargas ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de RLS já usado em equipments: qualquer usuário approved pode
-- ler/escrever (não há isolamento por dono nesta camada, igual às demais tabelas).
CREATE POLICY "approved users read cargas" ON public.cargas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'approved'));
CREATE POLICY "approved users write cargas" ON public.cargas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'approved'));
CREATE POLICY "approved users update cargas" ON public.cargas
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'approved'));
CREATE POLICY "approved users delete cargas" ON public.cargas
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'approved'));
