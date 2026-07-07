CREATE TABLE public.cargas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  descricao text NOT NULL DEFAULT '',
  valor numeric(14,2) NOT NULL DEFAULT 0,
  peso numeric(14,2),
  volume numeric(14,2),
  veiculo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cargas_equipment_idx ON public.cargas(equipment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargas TO authenticated;
GRANT ALL ON public.cargas TO service_role;

ALTER TABLE public.cargas ENABLE ROW LEVEL SECURITY;

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