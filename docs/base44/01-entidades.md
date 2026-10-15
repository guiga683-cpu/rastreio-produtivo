# 01 — Entidades (modelo de dados) para o Base44

Este documento descreve **todas as tabelas de dados** do app Embarque Certo e como elas viram **entidades nativas do Base44**. O schema abaixo é o estado final, depois de aplicadas as 13 migrations do banco original (Supabase/Postgres), em ordem.

## Visão geral

| Entidade Base44 | Tabela original | O que guarda | Relação |
|---|---|---|---|
| `Project` | `projects` | Projeto de um cliente | 1 Project → N Equipment |
| `Equipment` | `equipments` | Item do projeto (Equipamento, Material, Material TRT ou Serviço) | N Equipment → 1 Project; 1 Equipment → N Carga |
| `Carga` | `cargas` | Cargas/parcelas de um item de tipo material | N Carga → 1 Equipment |
| `MetaFaturamento` | `metas_faturamento` | Meta anual de faturamento (1 por ano, compartilhada) | — |
| `User` (nativa, só campos extras) | `profiles` + `user_roles` | Status de aprovação e papel admin/usuário | — |

Total: **4 entidades novas + extensão da entidade nativa `User`** (5 arquivos JSON na pasta `entities/`).

### Convenções importantes

- **Campos nativos do Base44** (não criar): todo registro já tem `id`, `created_date`, `updated_date` e `created_by` (e-mail de quem criou). Eles substituem `id`, `created_at`, `updated_at` e `user_id` das tabelas originais.
- **Referências**: o Base44 não tem chave estrangeira. As relações são campos de texto que guardam o `id` do registro pai (`Equipment.project_id`, `Carga.equipment_id`). A **exclusão em cascata** do banco original precisa ser feita pela tela (ver "Exclusão em cascata" abaixo).
- **`legacy_*`**: todas as entidades têm `legacy_id` (UUID original). `Equipment` e `Carga` têm também `legacy_project_id` / `legacy_equipment_id` (UUID do pai original) e `legacy_created_at` (data de criação original, para manter a ordem). Esses campos só servem para a migração e ficam vazios nos registros criados no Base44.
- **Ordem padrão de exibição** ("ordem de criação"): ordenar por `legacy_created_at` quando preenchido; senão por `created_date`. Registros migrados têm `legacy_created_at` mais antigo que qualquer registro novo, então a ordem fica natural.
- **Datas** (`format: date`) são texto `AAAA-MM-DD`. Comparações de data são feitas como texto nesse formato.
- **Dados compartilhados**: todos os usuários aprovados veem e editam **todos** os registros (não existe "meus projetos"). Não use a regra padrão "só o criador vê".

### Exclusão em cascata (obrigatório reproduzir)

No banco original: excluir um `projects` apaga seus `equipments` (ON DELETE CASCADE), e excluir um `equipments` apaga suas `cargas` (ON DELETE CASCADE). No Base44 isso deve ser feito explicitamente:

1. Ao excluir um **Project**: excluir todas as `Carga` cujo `equipment_id` pertença a um Equipment do projeto → excluir todos os `Equipment` com `project_id` = id do projeto → excluir o Project.
2. Ao remover um **Equipment** (na edição do projeto): excluir antes todas as `Carga` com `equipment_id` = id dele.

---

## Entidade `Project`

| Campo | Tipo | Enum | Default | Obrigatório | Descrição |
|---|---|---|---|---|---|
| `name` | string | — | — | sim | Nome/código do projeto (ex.: B5000572) |
| `client` | string | — | — | sim | Cliente (ex.: Kamesq) |
| `concluido` | boolean | — | `false` | não | Projeto concluído/fechado. Afeta **só** a tela Projetos (filtro e botão Concluir/Reabrir). O projeto continua no Dashboard e no Faturamento. |
| `legacy_id` | string | — | — | não | UUID original (`projects.id`) |
| `legacy_created_at` | string (date-time) | — | — | não | `projects.created_at` original |

Esquema completo: `entities/Project.json`

<!-- EMBED entities/Project.json -->

## Entidade `Equipment`

Apesar do nome, é qualquer **item** do projeto. O campo `tipo` define o comportamento.

| Campo | Tipo | Enum (valores exatos) | Default | Obrigatório | Rótulo na tela / descrição |
|---|---|---|---|---|---|
| `project_id` | string (referência → Project.id) | — | — | sim | Projeto dono do item |
| `equipamento` | string | — | `""` | sim | "Equipamento" (descrição do item; multilinha) |
| `tipo` | string | `Equipamento`, `Material`, `Material TRT`, `Serviço` | `Equipamento` | sim | "Tipo" |
| `posicao` | string | — | `""` | não | "Posição" — só para tipo Equipamento |
| `valor_unitario` | number | — | `0` | sim | "Valor" (R$). Em materiais com cargas = soma das cargas |
| `quantidade` | integer | — | `1` | sim | "Qtd" |
| `data_producao` | string (date) | — | — | não | "Data Prod." — só Equipamento |
| `status_producao` | string | `OK`, `NOK` | `NOK` | não | "Status Prod." — só Equipamento (vazio nos materiais) |
| `data_embarque` | string (date) | — | — | não | "Data Embarque" — base de atraso/janelas/faturamento |
| `status_embarque` | string | `Não expedido`, `Expedido`, `Cancelado` | `Não expedido` | sim | "Status Embarque" |
| `data_faturamento` | string (date) | — | — | não | "Data Faturamento" — só informativa |
| `frete` | string | `CIF`, `FOB` | (vazio) | não | "Frete" (vazio exibe "—") |
| `peso` | number | — | — | não | LEGADO — sempre gravado vazio pelas telas; só sai no XLSX |
| `volume` | number | — | — | não | LEGADO — idem |
| `veiculo` | string | — | — | não | LEGADO — sempre gravado vazio; não exibido |
| `observacao` | string | — | — | não | **"Link"** na tela (com botão copiar) |
| `nota` | string | — | — | não | **"Obs"** na tela |
| `romaneio` | string | `OK`, `NOK` | `NOK` | sim | "Romaneio" (toggle no Dashboard) |
| `painel` | string | `OK`, `NOK` | `NOK` | sim | "Painel" (toggle no Dashboard) |
| `custo` | string | `OK`, `NOK` | `NOK` | sim | "Custo" (toggle no Dashboard, só seção Materiais) |
| `fluxo` | string | `OK`, `NOK` | `NOK` | sim | "Fluxo" (toggle no Dashboard) |
| `legacy_id` | string | — | — | não | UUID original (`equipments.id`) |
| `legacy_project_id` | string | — | — | não | UUID original do projeto |
| `legacy_created_at` | string (date-time) | — | — | não | `equipments.created_at` original |

> Atenção aos nomes trocados: o campo `observacao` aparece na tela como **Link**; o campo `nota` aparece como **Obs**.

Esquema completo: `entities/Equipment.json`

<!-- EMBED entities/Equipment.json -->

## Entidade `Carga`

| Campo | Tipo | Default | Obrigatório | Descrição |
|---|---|---|---|---|
| `equipment_id` | string (referência → Equipment.id) | — | sim | Item dono da carga |
| `descricao` | string | `""` | sim | Descrição |
| `valor` | number | `0` | sim | Valor (R$) |
| `peso` | number | — | não | Peso |
| `volume` | number | — | não | Volume |
| `veiculo` | string | — | não | Veículo |
| `legacy_id` | string | — | não | UUID original (`cargas.id`) |
| `legacy_equipment_id` | string | — | não | UUID original do item |
| `legacy_created_at` | string (date-time) | — | não | `cargas.created_at` original |

Regra: sempre que uma Carga é criada, alterada ou excluída, o `Equipment.valor_unitario` do item dono passa a ser **a soma de `valor` de todas as cargas restantes daquele item** (inclusive 0 se não sobrar nenhuma).

Esquema completo: `entities/Carga.json`

<!-- EMBED entities/Carga.json -->

## Entidade `MetaFaturamento`

| Campo | Tipo | Default | Obrigatório | Descrição |
|---|---|---|---|---|
| `ano` | integer | — | sim | Ano. **Único**: no máximo um registro por ano (gravar = procurar pelo ano e atualizar; se não existir, criar) |
| `valor` | number | `0` | sim | Valor da meta (R$) |
| `legacy_id` | string | — | não | UUID original |

A meta é **compartilhada**: não depende de quem criou (a migration original removeu a unicidade por usuário e criou unicidade só por `ano`).

Esquema completo: `entities/MetaFaturamento.json`

<!-- EMBED entities/MetaFaturamento.json -->

## Entidade nativa `User` (campos extras)

O Base44 já tem a entidade `User` com `id`, `email`, `full_name`, `role` (`admin`/`user`) e `created_date`. Adicionar:

| Campo | Tipo | Enum | Default | Descrição |
|---|---|---|---|---|
| `approval_status` | string | `pending`, `approved`, `rejected` | `pending` | Status de aprovação. Rótulos: Pendente / Aprovado / Rejeitado |
| `legacy_id` | string | — | — | UUID original do usuário |

E **usar** o campo nativo `role` (`admin` / `user`) no lugar da tabela `user_roles`.

Esquema completo: `entities/User.json`

<!-- EMBED entities/User.json -->

---

## Tradução da autorização (Supabase → Base44)

### Como funcionava no app original

- Tabela `profiles` (1 linha por usuário): `status` = `pending` | `approved` | `rejected`. Um gatilho no banco (`handle_new_user`) criava o perfil como `pending` em todo cadastro novo.
- Tabela `user_roles`: linhas `(user_id, role)` com `role` = `admin` | `user`. A função `has_role(usuario, 'admin')` dizia se alguém é admin. Na prática só a linha `admin` é usada; "não ter linha admin" = usuário comum.
- Todas as tabelas de dados liberam leitura/escrita a qualquer usuário com `profiles.status = 'approved'`.
- A tela (rota protegida) também bloqueava: sem login → tela de login; logado mas não aprovado → desloga e volta para o login; aba/rota Admin só para admin.

### Como fica no Base44

| Original | Base44 |
|---|---|
| `profiles.status` | `User.approval_status` (default `pending`) |
| `user_roles` com `role='admin'` | `User.role = 'admin'` (campo nativo) |
| sem linha em `user_roles` / `role='user'` | `User.role = 'user'` |
| gatilho `handle_new_user` (cria perfil `pending`) | default `pending` do campo `approval_status` — todo usuário novo nasce pendente |
| função `has_role(uid,'admin')` | condição `user.role == 'admin'` |
| condição "usuário aprovado" (`EXISTS profiles ... status='approved'`) | condição `user.approval_status == 'approved'` |

**Regra de segurança extra (obrigatória no Base44):** o usuário comum **não pode** alterar o próprio `approval_status` nem o próprio `role`. Só admin altera campos de outros usuários. Verifique isso no painel de segurança do Base44 (no Supabase original isso era garantido porque só admin tinha política de UPDATE em `profiles`).

> Sintaxe das regras: os blocos `"rls"` nos JSON usam a sintaxe de regras do Base44 (`user_condition`, `$or`, `{{user.id}}`). Se o editor do Base44 recusar alguma condição (por exemplo, condição sobre um campo customizado do usuário), configure a mesma regra pelo painel de permissões/segurança da entidade, ou peça ao assistente do Base44: "restrinja leitura e escrita desta entidade a usuários com approval_status = approved". O que importa é a **equivalência** da tabela abaixo.

### Todas as policies RLS originais e sua equivalência

Estado final (depois de todas as migrations). As policies `own projects`, `own equipments` e `own metas` (dono = `user_id`) **foram removidas** na 3ª migration e substituídas pelas policies de "usuário aprovado" — por isso o Base44 **não** deve filtrar por criador.

| # | Tabela | Policy original | Operação | Condição original | Equivalente Base44 |
|---|---|---|---|---|---|
| 1 | projects | approved users read projects | SELECT | usuário logado com `profiles.status='approved'` | `Project.rls.read`: `user.approval_status == 'approved'` |
| 2 | projects | approved users write projects | INSERT | idem | `Project.rls.create`: aprovado |
| 3 | projects | approved users update projects | UPDATE | idem | `Project.rls.update`: aprovado |
| 4 | projects | approved users delete projects | DELETE | idem | `Project.rls.delete`: aprovado |
| 5 | equipments | approved users read equipments | SELECT | aprovado | `Equipment.rls.read`: aprovado |
| 6 | equipments | approved users write equipments | INSERT | aprovado | `Equipment.rls.create`: aprovado |
| 7 | equipments | approved users update equipments | UPDATE | aprovado | `Equipment.rls.update`: aprovado |
| 8 | equipments | approved users delete equipments | DELETE | aprovado | `Equipment.rls.delete`: aprovado |
| 9 | metas_faturamento | approved users read metas | SELECT | aprovado | `MetaFaturamento.rls.read`: aprovado |
| 10 | metas_faturamento | approved users write metas | INSERT | aprovado | `MetaFaturamento.rls.create`: aprovado |
| 11 | metas_faturamento | approved users update metas | UPDATE | aprovado | `MetaFaturamento.rls.update`: aprovado |
| 12 | metas_faturamento | approved users delete metas | DELETE | aprovado | `MetaFaturamento.rls.delete`: aprovado |
| 13 | cargas | approved users read cargas | SELECT | aprovado | `Carga.rls.read`: aprovado |
| 14 | cargas | approved users write cargas | INSERT | aprovado | `Carga.rls.create`: aprovado |
| 15 | cargas | approved users update cargas | UPDATE | aprovado | `Carga.rls.update`: aprovado |
| 16 | cargas | approved users delete cargas | DELETE | aprovado | `Carga.rls.delete`: aprovado |
| 17 | profiles | users read own profile | SELECT | `auth.uid() = id` | `User.rls.read`: o próprio registro (`id == user.id`) |
| 18 | profiles | admins read all profiles | SELECT | `has_role(uid,'admin')` | `User.rls.read`: OU `user.role == 'admin'` |
| 19 | profiles | admins update profiles | UPDATE | `has_role(uid,'admin')` | `User.rls.update`: só `user.role == 'admin'` (o usuário comum não altera nem o próprio status) |
| 20 | user_roles | users read own roles | SELECT | `auth.uid() = user_id` | cada usuário enxerga o próprio `role` (nativo do Base44) |
| 21 | user_roles | admins read all roles | SELECT | `has_role(uid,'admin')` | admin enxerga `role` de todos (coberto pela regra 18) |
| 22 | user_roles | admins manage roles | ALL | `has_role(uid,'admin')` | só admin altera `User.role` (coberto pela regra 19) |
| — | (removida) own projects / own equipments / own metas | ALL | `auth.uid() = user_id` | **não reproduzir** (foram descartadas) |

Outros objetos de banco e sua equivalência:

| Objeto original | Equivalente |
|---|---|
| Função `has_role` | `user.role == 'admin'` |
| Gatilho `on_auth_user_created` → `handle_new_user` | default `pending` em `User.approval_status` |
| Gatilho `update_updated_at_column` (profiles, metas) | `updated_date` nativo |
| `UNIQUE (ano)` em metas | upsert por `ano` na tela de Faturamento |
| `ON DELETE CASCADE` (projects→equipments→cargas) | exclusão em cascata feita pela tela (ver acima) |
| `CHECK` de enum (status, frete, romaneio…) | `enum` nos JSON |
| Migration que promoveu um usuário específico a admin+aprovado e moveu todos os dados para ele | não reproduzir; o dono do app no Base44 já é admin; os dados são compartilhados |

### Proteção das telas (além das regras de dados)

1. Usuário não logado → tela de login do Base44.
2. Logado com `approval_status` ≠ `approved` → **tela de acesso pendente/rejeitado** (nenhum dado é carregado) com botão "Sair".
3. Aba e página **Admin** visíveis/acessíveis só para `role = 'admin'`; quem não é admin e abrir a página é mandado para o Dashboard.
4. O administrador dono do app no Base44 deve ter `approval_status = approved` (definir manualmente na primeira vez, no painel de dados do Base44).
