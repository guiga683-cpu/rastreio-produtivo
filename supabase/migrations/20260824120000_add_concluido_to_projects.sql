-- Status "concluído" do projeto, usado apenas na listagem/filtro da tela Projetos.
ALTER TABLE public.projects
  ADD COLUMN concluido boolean NOT NULL DEFAULT false;
