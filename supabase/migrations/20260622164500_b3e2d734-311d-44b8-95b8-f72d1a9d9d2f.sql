
ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Equipamento';

CREATE TABLE IF NOT EXISTS public.metas_faturamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ano)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_faturamento TO authenticated;
GRANT ALL ON public.metas_faturamento TO service_role;

ALTER TABLE public.metas_faturamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own metas" ON public.metas_faturamento
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_metas_faturamento_updated_at ON public.metas_faturamento;
CREATE TRIGGER update_metas_faturamento_updated_at
  BEFORE UPDATE ON public.metas_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
