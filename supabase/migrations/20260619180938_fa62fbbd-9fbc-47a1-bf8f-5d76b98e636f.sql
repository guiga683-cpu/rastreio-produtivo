
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.equipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  equipamento TEXT NOT NULL DEFAULT '',
  posicao TEXT NOT NULL DEFAULT '',
  valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_producao DATE,
  status_producao TEXT NOT NULL DEFAULT 'NOK' CHECK (status_producao IN ('OK','NOK')),
  data_embarque DATE,
  status_embarque TEXT NOT NULL DEFAULT 'Não expedido' CHECK (status_embarque IN ('Não expedido','Expedido','Cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX equipments_project_idx ON public.equipments(project_id);
CREATE INDEX equipments_user_idx ON public.equipments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipments TO authenticated;
GRANT ALL ON public.equipments TO service_role;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own equipments" ON public.equipments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
