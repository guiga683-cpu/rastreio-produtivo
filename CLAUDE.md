# CLAUDE.md

Memória do projeto para agentes de IA (Claude Code). Leia antes de trabalhar.

## 1. Visão geral

**Embarques** (repo `rastreio-produtivo`) é um app web interno para
**rastreamento de produção e embarque de equipamentos/materiais por projeto**.
Cada projeto pertence a um cliente e contém uma lista de equipamentos com valor,
quantidade, datas e status de produção (`OK`/`NOK`) e de embarque
(`Não expedido`/`Expedido`/`Cancelado`). O app calcula itens atrasados, próximos
30 dias, faturamento por mês/ano e metas anuais. Acesso é restrito: usuários se
cadastram, ficam `pending` e precisam ser aprovados por um admin.

## 2. Stack e arquitetura

- **Runtime/gerenciador**: Bun (`bun.lock`, `bunfig.toml`).
- **Framework**: TanStack Start (SSR) + TanStack Router (file-based) + React 19.
- **Build**: Vite 8 via `@lovable.dev/vite-tanstack-config` (wrapper que já inclui
  tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro com target Cloudflare,
  componentTagger, injeção de `VITE_*`, alias `@`). Build server através de Nitro.
- **Dados/Auth**: Supabase (`@supabase/supabase-js`). Postgres com RLS.
- **Estado de servidor**: TanStack React Query.
- **UI**: shadcn/ui (estilo "new-york", baseColor slate) + Radix UI + Tailwind CSS v4
  + lucide-react (ícones). Toasts via sonner. Formulários: react-hook-form + zod.
- **Plataforma**: projeto conectado ao **Lovable** (edição em sandbox + preview).

Fluxo de auth e autorização:
- `src/integrations/supabase/client.ts` — cliente browser (anon key, RLS).
- `src/integrations/supabase/client.server.ts` — cliente admin (service role,
  **ignora RLS**); só em código de servidor (`*.server.ts`).
- `src/integrations/supabase/auth-middleware.ts` / `auth-attacher.ts` — middleware
  de auth para server functions (valida Bearer token).
- Rotas protegidas ficam sob `src/routes/_authenticated/`. O `route.tsx` faz
  `beforeLoad`: exige usuário logado, `profiles.status === 'approved'` e injeta
  `isAdmin` no contexto. A rota `/admin` exige `isAdmin`.

## 3. Estrutura de diretórios

```
src/
  routes/                 # rotas file-based do TanStack (NÃO usar src/pages)
    __root.tsx            # shell do app (Outlet, providers, 404). Preservar.
    index.tsx             # "/" → redireciona para /dashboard
    auth.tsx              # login/cadastro (Supabase Auth)
    _authenticated/       # área logada (guard de auth + aprovação)
      route.tsx           # layout + beforeLoad (auth/approved/isAdmin) + TopBar
      dashboard.tsx       # visão geral: atrasados, próximos 30d, totais
      faturamento.tsx     # faturamento por mês/ano + metas; export
      projetos.tsx        # listagem/edição de projetos e equipamentos
      novo.tsx            # criação de projeto + equipamentos
      admin.tsx           # aprovação de usuários e gestão de roles
    README.md             # convenções de rotas (LER ao mexer em rotas)
  components/
    ui/                   # shadcn/ui (gerado; ver components.json)
    badges.tsx, equip-editor.tsx, equip-table.tsx, top-bar.tsx
  hooks/                  # use-auth, use-mobile
  integrations/supabase/  # clients, middleware, types (gerados)
  lib/
    embarques.ts          # tipos do domínio + helpers (formatBRL, datas, isLate…)
    seed.ts               # popula dados de exemplo se o usuário não tiver projetos
    error-capture.ts, error-page.ts, lovable-error-reporting.ts, utils.ts
  router.tsx, server.ts, start.ts, styles.css, routeTree.gen.ts
supabase/
  migrations/             # migrações SQL (schema, RLS, roles, profiles)
  config.toml
```

## 4. Comandos essenciais

```bash
bun install            # instalar dependências
bun run dev            # rodar localmente (vite dev)
bun run build          # build de produção
bun run build:dev      # build em modo development
bun run preview        # servir o build
bun run lint           # eslint .
bun run format         # prettier --write .
```

- **Não há script de testes** definido no `package.json` (ver seção 6).
- **Migrações**: arquivos SQL em `supabase/migrations/` aplicados via Supabase
  (não há comando local no `package.json`; gestão feita pelo Supabase/Lovable).

## 5. Convenções de código

- **TypeScript strict**. Alias de import: `@/*` → `src/*`.
- **Prettier**: printWidth 100, ponto-e-vírgula, aspas duplas, `trailingComma: all`.
- **ESLint** (flat config): regras de react-hooks; `no-restricted-imports` bloqueia
  `server-only` (use sufixo `*.server.ts`); `@typescript-eslint/no-unused-vars` off.
- **Rotas**: file-based (ver `src/routes/README.md`). `$id` para dinâmico, `_layout`
  para layout, `__root.tsx` é o único shell. **Não** criar `src/pages/` nem padrões
  Next/Remix.
- **Domínio em PT-BR**: textos de UI, status (`Não expedido`, `Expedido`…) e nomes
  de campos (`equipamento`, `posicao`, `valor_unitario`, `data_embarque`) em
  português. Valores formatados em `formatBRL` (`src/lib/embarques.ts`).
- **Acesso a dados**: nas rotas, usar React Query + cliente `supabase` (browser).
  Reaproveitar tipos e helpers de `src/lib/embarques.ts`.
- **Commits/branches**: sem convenção formal evidenciada. Trabalhe na branch de
  feature designada; **não reescreva histórico já publicado** (ver seção 8).

## 6. Fluxo de testes

Não há framework de testes nem script `test` configurado no momento.
Antes de commitar, rode no mínimo:

```bash
bun run lint
bun run build   # confirma que o app compila (SSR + client)
```

TODO: confirmar — se for adicionar testes, alinhar framework com o time
(nenhuma dependência de teste como vitest/jest está presente).

## 7. Skills disponíveis

Nenhuma skill de repositório encontrada (não existem `.claude/skills/` nem
`skills/`). As skills disponíveis na sessão são do harness do Claude Code, não do
projeto.

## 8. Regras e gotchas

- **Lovable**: projeto conectado ao Lovable (ver `AGENTS.md`). **Nunca** force-push
  nem rebase/amend/squash de commits já publicados — isso corrompe o histórico do
  Lovable. Mantenha a branch sempre em estado funcional, pois commits sincronizam
  para o editor.
- **Arquivos gerados — não editar à mão**:
  - `src/routeTree.gen.ts` (gerado pelo router plugin)
  - `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-middleware.ts`,
    `types.ts` (cabeçalho "automatically generated")
  - `src/components/ui/*` (shadcn; regenerar via CLI conforme `components.json`)
- **vite.config.ts**: não adicionar manualmente plugins já incluídos pelo
  `@lovable.dev/vite-tanstack-config` (tanstackStart, viteReact, tailwindcss, etc.)
  — duplicá-los quebra o app.
- **Service role**: `client.server.ts` ignora RLS. Use **somente** em servidor e
  importe dinamicamente dentro de handlers (`await import("@/integrations/supabase/client.server")`).
  Nunca importe em arquivos que vão para o bundle do cliente (rotas, `*.functions.ts`).
- **Segredos**: `.env` está versionado e contém chaves Supabase (URL, anon/publishable).
  As variáveis client-side precisam do prefixo `VITE_`. **Nunca** comite a
  `SUPABASE_SERVICE_ROLE_KEY` (ela não está no `.env` versionado).
- **Supply-chain guard (`bunfig.toml`)**: `minimumReleaseAge = 86400` bloqueia
  pacotes publicados há menos de 24h. Só adicione exceções em
  `minimumReleaseAgeExcludes` após confirmar com o usuário.
- **Autorização**: novos usuários nascem `pending`; precisam ser `approved` por um
  admin (rota `/admin`) para acessar a área logada. Roles em `user_roles`
  (`admin`/`user`); checagem via função SQL `has_role`.
- **Seed**: `seedExampleIfEmpty` (`src/lib/seed.ts`) insere dados de exemplo no
  primeiro acesso quando o usuário não tem projetos — atenção em ambientes limpos.
- **Migrações**: são append-only e refletem a evolução do schema/RLS. Não edite
  migrações já aplicadas; crie uma nova.
