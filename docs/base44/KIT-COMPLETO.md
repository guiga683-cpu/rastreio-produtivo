# KIT COMPLETO — Replicação do app Embarque Certo no Base44

Este arquivo reúne, nesta ordem: 00-LEIA-ME, 01-entidades (com os JSON das entidades embutidos), 02-funcionalidades, 03-prompts-base44 e 04-migracao-dados. O conteúdo é idêntico ao dos arquivos separados.

Sumário:

1. LEIA-ME
2. Entidades (com JSON)
3. Funcionalidades e checklist
4. Prompts para o Base44
5. Migração de dados


---

<!-- ===== Arquivo: 00-LEIA-ME.md ===== -->

# Kit de replicação Base44 — Embarque Certo ("Embarques / Guntner")

## O que é o app

Um app web interno para **acompanhar a produção, o embarque e o faturamento** de itens por projeto. Cada **projeto** (código + cliente) tem uma lista de **itens** de 4 tipos — Equipamento, Material, Material TRT e Serviço — com valor, quantidade, datas e status. O app mostra:

- **Dashboard**: o que está atrasado e o que embarca nos próximos 10 ou 30 dias, com checklists (Romaneio, Painel, Custo, Fluxo), status editável e cargas dos materiais.
- **Projetos / Novo projeto**: cadastro e edição de projetos e seus itens; concluir/reabrir projeto.
- **Faturamento**: quanto foi faturado (itens expedidos) e quanto falta (futuro), por ano/mês/projeto/tipo, com meta anual, gráficos e exportação para Excel.
- **Admin**: aprovação de novos usuários e definição de administradores.

## Quem usa

- **Equipe de logística** (usuário comum): cadastra projetos e itens, atualiza status e checklists, registra cargas, consulta faturamento. Todos os usuários aprovados veem e editam os mesmos dados.
- **Administrador**: tudo o que a equipe faz + aprova/rejeita cadastros e promove/rebaixa administradores. Quem se cadastra fica **pendente** até um admin aprovar.

## O que é cada arquivo

| Arquivo | Conteúdo |
|---|---|
| `00-LEIA-ME.md` | Este guia |
| `01-entidades.md` + pasta `entities/` | Modelo de dados: entidades Project, Equipment, Carga, MetaFaturamento e campos extras do User, com um JSON Schema por entidade e as regras de permissão |
| `02-funcionalidades.md` | Descrição completa de cada tela e de todas as regras/fórmulas + **checklist numerada (128 itens)** para validar |
| `03-prompts-base44.md` | Prompts prontos para colar no Base44, em ordem (P0 a P8), cada um com critérios de aceite |
| `04-migracao-dados.md` | Como importar os dados atuais (CSV), religar as referências e recriar os acessos |
| `KIT-COMPLETO.md` | Todos os arquivos acima num só documento |

Você **não** precisa do código original nem do Supabase: tudo o que é necessário está neste kit. O Base44 usará **banco nativo** (entidades próprias).

## Passo a passo

1. **Leia** rapidamente `02-funcionalidades.md` (seções 0 a 9) para entender o app.
2. **Crie o app** no Base44 (em branco) e cole o prompt **P0** de `03-prompts-base44.md` junto com os 5 JSON da pasta `entities/`. Confira os critérios de aceite. Coloque o seu próprio usuário com `approval_status = approved` no painel de dados.
3. **Cole os prompts em ordem**: P1 (login e aprovação) → P2 (layout/menu) → P3 (Projetos) → P4 (formulário de itens, Novo projeto e edição) → P5a, P5b, P5c (Dashboard) → P6a, P6b (Faturamento) → P7 (Admin). Depois de cada um, confira os critérios de aceite antes de seguir. Se algo falhar, diga ao Base44 qual critério falhou.
4. **Importe os dados**: siga a Parte B de `04-migracao-dados.md` com os CSV que o dono do app vai lhe enviar (projects → equipments → cargas → metas) e use a página de religação de referências. Confira os números.
5. **Recrie os acessos**: convide os usuários listados em `usuarios.csv` e aprove-os na página Admin (marque como admin quem era admin).
6. **Valide**: cole o prompt **P8** e depois percorra manualmente a checklist da seção 10 de `02-funcionalidades.md` (itens 1 a 128), marcando cada item.

Dica: teste sempre com dois usuários — você (admin) e um usuário comum de teste.


---

<!-- ===== Arquivo: 01-entidades.md ===== -->

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

```json
{
  "name": "Project",
  "type": "object",
  "description": "Projeto de um cliente. Agrupa os itens (Equipment) a produzir/embarcar. Origem: tabela public.projects.",
  "properties": {
    "name": {
      "type": "string",
      "description": "Nome/código do projeto (ex.: B5000572). Obrigatório no cadastro (tela Novo projeto). Origem: projects.name (NOT NULL)."
    },
    "client": {
      "type": "string",
      "description": "Nome do cliente (ex.: Kamesq). Obrigatório no cadastro. Origem: projects.client (NOT NULL)."
    },
    "concluido": {
      "type": "boolean",
      "default": false,
      "description": "true = projeto concluído/fechado. Usado SOMENTE no filtro Em aberto/Fechados/Todos da tela Projetos e no botão Concluir/Reabrir. NÃO esconde o projeto do Dashboard nem do Faturamento. Origem: projects.concluido (NOT NULL DEFAULT false)."
    },
    "legacy_id": {
      "type": "string",
      "description": "UUID original do projeto no Supabase (projects.id). Usado apenas na migração para religar Equipment.project_id. Vazio em projetos criados no Base44."
    },
    "legacy_created_at": {
      "type": "string",
      "format": "date-time",
      "description": "Data/hora de criação original (projects.created_at). Preserva a ordem original dos cards. Ordenação do app: legacy_created_at se preenchido, senão created_date. Vazio em projetos criados no Base44."
    }
  },
  "required": ["name", "client"],
  "rls": {
    "create": { "user_condition": { "approval_status": "approved" } },
    "read": { "user_condition": { "approval_status": "approved" } },
    "update": { "user_condition": { "approval_status": "approved" } },
    "delete": { "user_condition": { "approval_status": "approved" } }
  }
}
```

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

```json
{
  "name": "Equipment",
  "type": "object",
  "description": "Item de um projeto (linha da planilha de embarque). Apesar do nome, representa 4 tipos: Equipamento, Material, Material TRT e Serviço (campo tipo). Origem: tabela public.equipments.",
  "properties": {
    "project_id": {
      "type": "string",
      "description": "REFERÊNCIA ao Project dono do item (id do registro Project no Base44). Obrigatório. Ao excluir o Project, excluir também todos os Equipment dele (e as Cargas desses Equipment). Origem: equipments.project_id (FK ON DELETE CASCADE)."
    },
    "equipamento": {
      "type": "string",
      "default": "",
      "description": "Descrição do item (texto livre, pode ter várias linhas). Rótulo na tela: 'Equipamento' (na planilha de Materiais: 'Descrição'). Origem: equipments.equipamento (NOT NULL DEFAULT '')."
    },
    "tipo": {
      "type": "string",
      "enum": ["Equipamento", "Material", "Material TRT", "Serviço"],
      "default": "Equipamento",
      "description": "Tipo do item. 'Equipamento' usa posição e produção; 'Material', 'Material TRT' e 'Serviço' são tratados como materiais (sem posição/produção, com cargas). Origem: equipments.tipo (TEXT NOT NULL DEFAULT 'Equipamento')."
    },
    "posicao": {
      "type": "string",
      "default": "",
      "description": "Posição/TAG do equipamento (texto; quando numérico é ordenado como número). Editável só quando tipo = Equipamento; vira vazio (null) ao trocar para tipo material. Opcional. Origem: equipments.posicao (TEXT, NULL permitido)."
    },
    "valor_unitario": {
      "type": "number",
      "default": 0,
      "description": "Valor unitário em R$ (2 casas). Para itens de tipo material que têm Cargas, este campo é recalculado automaticamente = soma de Carga.valor do item. Origem: equipments.valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0."
    },
    "quantidade": {
      "type": "integer",
      "default": 1,
      "description": "Quantidade (inteiro, mínimo 1 no formulário). Subtotal = valor_unitario × quantidade. Origem: equipments.quantidade INTEGER NOT NULL DEFAULT 1."
    },
    "data_producao": {
      "type": "string",
      "format": "date",
      "description": "Data de produção (AAAA-MM-DD). Só para tipo Equipamento. Opcional. Origem: equipments.data_producao DATE."
    },
    "status_producao": {
      "type": "string",
      "enum": ["OK", "NOK"],
      "default": "NOK",
      "description": "Status de produção. Só para tipo Equipamento; fica vazio (null) nos tipos material. Origem: equipments.status_producao TEXT CHECK IN ('OK','NOK'), DEFAULT 'NOK', NULL permitido."
    },
    "data_embarque": {
      "type": "string",
      "format": "date",
      "description": "Data prevista de embarque (AAAA-MM-DD). Base de TODAS as regras de atraso, janelas de 10/30 dias e do faturamento por mês/ano. Opcional. Origem: equipments.data_embarque DATE."
    },
    "status_embarque": {
      "type": "string",
      "enum": ["Não expedido", "Expedido", "Cancelado"],
      "default": "Não expedido",
      "description": "Status de embarque. Expedido = faturado; Não expedido = futuro/pendente; Cancelado = ignorado no faturamento. Origem: equipments.status_embarque TEXT NOT NULL DEFAULT 'Não expedido' CHECK."
    },
    "data_faturamento": {
      "type": "string",
      "format": "date",
      "description": "Data de faturamento (AAAA-MM-DD). Apenas informativa (exibida e exportada); NÃO entra em nenhum cálculo. Opcional. Origem: equipments.data_faturamento DATE."
    },
    "frete": {
      "type": "string",
      "enum": ["CIF", "FOB"],
      "description": "Modalidade de frete. Opcional (vazio = '—'). Origem: equipments.frete TEXT CHECK IN ('CIF','FOB'), NULL permitido."
    },
    "peso": {
      "type": "number",
      "description": "LEGADO. Peso do item. As telas de cadastro/edição sempre gravam vazio; a coluna da tabela sempre mostra '—'. Só aparece na exportação XLSX (aba Materiais, 'Peso (kg)'). Manter para migração. Origem: equipments.peso NUMERIC(10,2)."
    },
    "volume": {
      "type": "number",
      "description": "LEGADO. Volume do item. Mesmo comportamento de peso; exportado como 'Volume (m³)'. Origem: equipments.volume NUMERIC(10,2)."
    },
    "veiculo": {
      "type": "string",
      "description": "LEGADO. Veículo do item. As telas sempre gravam vazio; não é exibido. Origem: equipments.veiculo TEXT."
    },
    "observacao": {
      "type": "string",
      "description": "Campo exibido na tela com o rótulo 'Link' (texto livre, normalmente um link). Tem botão de copiar. Exportado como 'Observação' na aba Materiais. Opcional. Origem: equipments.observacao TEXT."
    },
    "nota": {
      "type": "string",
      "description": "Campo exibido na tela com o rótulo 'Obs' (observação livre). Opcional. Origem: equipments.nota TEXT."
    },
    "romaneio": {
      "type": "string",
      "enum": ["OK", "NOK"],
      "default": "NOK",
      "description": "Checklist 'Romaneio' (alternado no Dashboard com um clique). Origem: equipments.romaneio TEXT NOT NULL DEFAULT 'NOK'."
    },
    "painel": {
      "type": "string",
      "enum": ["OK", "NOK"],
      "default": "NOK",
      "description": "Checklist 'Painel'. Origem: equipments.painel TEXT NOT NULL DEFAULT 'NOK'."
    },
    "custo": {
      "type": "string",
      "enum": ["OK", "NOK"],
      "default": "NOK",
      "description": "Checklist 'Custo' (exibido só na seção Materiais do Dashboard). Origem: equipments.custo TEXT NOT NULL DEFAULT 'NOK'."
    },
    "fluxo": {
      "type": "string",
      "enum": ["OK", "NOK"],
      "default": "NOK",
      "description": "Checklist 'Fluxo'. Origem: equipments.fluxo TEXT NOT NULL DEFAULT 'NOK'."
    },
    "legacy_id": {
      "type": "string",
      "description": "UUID original do item no Supabase (equipments.id). Usado na migração para religar Carga.equipment_id."
    },
    "legacy_project_id": {
      "type": "string",
      "description": "UUID original do projeto (equipments.project_id). Usado na migração para descobrir o novo project_id (Project.legacy_id = legacy_project_id)."
    },
    "legacy_created_at": {
      "type": "string",
      "format": "date-time",
      "description": "Data/hora de criação original (equipments.created_at). Ordem padrão: legacy_created_at se preenchido, senão created_date."
    }
  },
  "required": ["project_id", "equipamento", "tipo", "valor_unitario", "quantidade", "status_embarque", "romaneio", "painel", "custo", "fluxo"],
  "rls": {
    "create": { "user_condition": { "approval_status": "approved" } },
    "read": { "user_condition": { "approval_status": "approved" } },
    "update": { "user_condition": { "approval_status": "approved" } },
    "delete": { "user_condition": { "approval_status": "approved" } }
  }
}
```

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

```json
{
  "name": "Carga",
  "type": "object",
  "description": "Carga (parcela de embarque) de um item de tipo material (Material, Material TRT ou Serviço). A soma de Carga.valor do item vira o Equipment.valor_unitario. Origem: tabela public.cargas.",
  "properties": {
    "equipment_id": {
      "type": "string",
      "description": "REFERÊNCIA ao Equipment dono da carga (id do registro Equipment no Base44). Obrigatório. Ao excluir o Equipment, excluir também as cargas dele. Origem: cargas.equipment_id (FK ON DELETE CASCADE)."
    },
    "descricao": {
      "type": "string",
      "default": "",
      "description": "Descrição da carga. Origem: cargas.descricao TEXT NOT NULL DEFAULT ''."
    },
    "valor": {
      "type": "number",
      "default": 0,
      "description": "Valor da carga em R$ (2 casas). Origem: cargas.valor NUMERIC(14,2) NOT NULL DEFAULT 0."
    },
    "peso": {
      "type": "number",
      "description": "Peso da carga (opcional). Origem: cargas.peso NUMERIC(14,2)."
    },
    "volume": {
      "type": "number",
      "description": "Volume da carga (opcional). Origem: cargas.volume NUMERIC(14,2)."
    },
    "veiculo": {
      "type": "string",
      "description": "Veículo da carga (opcional, texto livre). Origem: cargas.veiculo TEXT."
    },
    "legacy_id": {
      "type": "string",
      "description": "UUID original da carga no Supabase (cargas.id)."
    },
    "legacy_equipment_id": {
      "type": "string",
      "description": "UUID original do item (cargas.equipment_id). Usado na migração para descobrir o novo equipment_id (Equipment.legacy_id = legacy_equipment_id)."
    },
    "legacy_created_at": {
      "type": "string",
      "format": "date-time",
      "description": "Data/hora de criação original (cargas.created_at). Ordem das cargas: legacy_created_at se preenchido, senão created_date."
    }
  },
  "required": ["equipment_id", "descricao", "valor"],
  "rls": {
    "create": { "user_condition": { "approval_status": "approved" } },
    "read": { "user_condition": { "approval_status": "approved" } },
    "update": { "user_condition": { "approval_status": "approved" } },
    "delete": { "user_condition": { "approval_status": "approved" } }
  }
}
```

## Entidade `MetaFaturamento`

| Campo | Tipo | Default | Obrigatório | Descrição |
|---|---|---|---|---|
| `ano` | integer | — | sim | Ano. **Único**: no máximo um registro por ano (gravar = procurar pelo ano e atualizar; se não existir, criar) |
| `valor` | number | `0` | sim | Valor da meta (R$) |
| `legacy_id` | string | — | não | UUID original |

A meta é **compartilhada**: não depende de quem criou (a migration original removeu a unicidade por usuário e criou unicidade só por `ano`).

Esquema completo: `entities/MetaFaturamento.json`

```json
{
  "name": "MetaFaturamento",
  "type": "object",
  "description": "Meta anual de faturamento, COMPARTILHADA por todos os usuários: no máximo UM registro por ano. Origem: tabela public.metas_faturamento (UNIQUE (ano)).",
  "properties": {
    "ano": {
      "type": "integer",
      "description": "Ano da meta (ex.: 2026). ÚNICO: antes de criar, procure um registro com o mesmo ano e atualize-o (upsert). Origem: metas_faturamento.ano INTEGER NOT NULL UNIQUE."
    },
    "valor": {
      "type": "number",
      "default": 0,
      "description": "Valor da meta em R$. Origem: metas_faturamento.valor NUMERIC NOT NULL DEFAULT 0."
    },
    "legacy_id": {
      "type": "string",
      "description": "UUID original no Supabase (metas_faturamento.id)."
    }
  },
  "required": ["ano", "valor"],
  "rls": {
    "create": { "user_condition": { "approval_status": "approved" } },
    "read": { "user_condition": { "approval_status": "approved" } },
    "update": { "user_condition": { "approval_status": "approved" } },
    "delete": { "user_condition": { "approval_status": "approved" } }
  }
}
```

## Entidade nativa `User` (campos extras)

O Base44 já tem a entidade `User` com `id`, `email`, `full_name`, `role` (`admin`/`user`) e `created_date`. Adicionar:

| Campo | Tipo | Enum | Default | Descrição |
|---|---|---|---|---|
| `approval_status` | string | `pending`, `approved`, `rejected` | `pending` | Status de aprovação. Rótulos: Pendente / Aprovado / Rejeitado |
| `legacy_id` | string | — | — | UUID original do usuário |

E **usar** o campo nativo `role` (`admin` / `user`) no lugar da tabela `user_roles`.

Esquema completo: `entities/User.json`

```json
{
  "name": "User",
  "type": "object",
  "description": "Campos ADICIONAIS da entidade nativa User do Base44 (ela já tem id, email, full_name, role, created_date). Substitui as tabelas public.profiles (status de aprovação) e public.user_roles (papel admin/user).",
  "properties": {
    "role": {
      "type": "string",
      "enum": ["admin", "user"],
      "default": "user",
      "description": "CAMPO NATIVO do Base44 (não criar de novo, só usar). 'admin' = administrador (vê a aba Admin, aprova usuários, promove/rebaixa admins). Equivale a existir uma linha em user_roles com role='admin'."
    },
    "approval_status": {
      "type": "string",
      "enum": ["pending", "approved", "rejected"],
      "default": "pending",
      "description": "Status de aprovação do acesso. Todo cadastro novo nasce 'pending'. Só 'approved' entra no app. 'rejected' é bloqueado. Rótulos na tela: Pendente / Aprovado / Rejeitado. Origem: profiles.status (enum approval_status, DEFAULT 'pending'). SOMENTE admin pode alterar este campo (o próprio usuário NÃO pode se autoaprovar)."
    },
    "legacy_id": {
      "type": "string",
      "description": "UUID original do usuário no Supabase (auth.users.id = profiles.id). Apenas referência histórica; senhas não migram."
    }
  },
  "rls": {
    "read": { "$or": [ { "id": "{{user.id}}" }, { "user_condition": { "role": "admin" } } ] },
    "update": { "user_condition": { "role": "admin" } },
    "delete": { "user_condition": { "role": "admin" } }
  }
}
```

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


---

<!-- ===== Arquivo: 02-funcionalidades.md ===== -->

# 02 — Inventário de funcionalidades (tela por tela)

Descrição exaustiva do app original. Cada item cita o arquivo de origem no repositório original (para auditoria; o colega não precisa do repositório). Textos entre aspas são **exatamente** os textos da tela.

## 0. Conceitos, formatos e regras globais

### 0.1 O app

"Embarques / Guntner" — controle de **produção e embarque** de itens por projeto. Cada **projeto** (cliente + código) tem uma lista de **itens** (equipamentos, materiais, materiais TRT e serviços) com valor, quantidade, datas e status. O app mostra o que está **atrasado**, o que embarca nos **próximos 10/30 dias** e o **faturamento** (itens expedidos) por mês/ano contra uma **meta anual**.

### 0.2 Formatos (fonte: `src/lib/embarques.ts`)

| Formato | Regra exata | Exemplo |
|---|---|---|
| Moeda (`formatBRL`) | `"R$ "` + número com 2 casas, vírgula decimal e **espaço** como separador de milhar. Vazio/nulo/inválido = 0 | `R$ 185 000,00`, `R$ 0,00` |
| Data (`formatDate`) | `AAAA-MM-DD` → `DD/MM/AAAA`; vazio → `—` (travessão) | `2026-07-08` → `08/07/2026` |
| Hoje (`todayISO`) | data local de hoje em `AAAA-MM-DD` | |
| Dias entre datas (`daysBetween(a,b)`) | `round((b − a) em dias)` | |
| Subtotal (`subtotal`) | `valor_unitario × quantidade` (vazios = 0) | |
| Meses (`MESES_PT`) | `Jan, Fev, Mar, Abr, Mai, Jun, Jul, Ago, Set, Out, Nov, Dez` | |

### 0.3 Regras de data de embarque (fonte: `src/lib/embarques.ts`)

Todas usam só `data_embarque` e `status_embarque`. `hoje` = data local.

| Regra | Fórmula exata |
|---|---|
| **Atrasado** (`isLate`) | `status_embarque == "Não expedido"` E `data_embarque` preenchida E `data_embarque < hoje` |
| **Embarque hoje** (`isToday`) | `status_embarque == "Não expedido"` E `data_embarque == hoje` |
| **Próximos 10 dias** (`isNext10`) | `status_embarque == "Não expedido"` E `data_embarque` preenchida E `0 ≤ dias(hoje → data_embarque) ≤ 10` |
| **Próximos 30 dias** (`isNext30`) | idem com `≤ 30` |
| **Dias de atraso** | `dias(data_embarque → hoje)` |

Observações: "hoje" conta como próximos 10/30 dias. Itens `Expedido` ou `Cancelado` nunca estão atrasados nem nas janelas. Itens sem `data_embarque` nunca entram.

### 0.4 Tipos de item (fonte: `src/lib/embarques.ts` `isTipoMaterial`, `src/components/equip-editor.tsx`, `src/components/equip-table.tsx`)

| Tipo | Grupo | Badge (cor) | Posição / Data Prod. / Status Prod. | Cargas | Seção do Dashboard | Aba do XLSX |
|---|---|---|---|---|---|---|
| `Equipamento` | Equipamento | azul claro (fundo azul primário 10%, texto azul `#185FA5`) | editáveis | não | Equipamentos | Equipamentos |
| `Material` | material | âmbar (fundo âmbar 20%, texto marrom escuro) | desabilitados e limpos | sim | Materiais | Materiais |
| `Material TRT` | material | roxo (fundo `#F3E8FF`, texto `#7E22CE`) | desabilitados e limpos; ao salvar são forçados a vazio | sim | Materiais | Materiais |
| `Serviço` | material | verde-azulado (fundo `#CCFBF1`, texto `#0F766E`) | desabilitados e limpos | sim | Materiais | Materiais |

"Grupo material" = `Material`, `Material TRT` ou `Serviço`.

Regras ao trocar o tipo no formulário de itens (`equip-editor.tsx` `updateTipo`):
- Para qualquer tipo material: `posicao`, `data_producao` e `status_producao` passam a vazio (null).
- De volta para `Equipamento`: se `status_producao` estiver vazio, vira `NOK`.
- Os campos Posição, Data Prod. e Status Prod. ficam **desabilitados** (cinza, cursor bloqueado) sempre que `tipo` ≠ `Equipamento`.

Regra ao salvar (Novo projeto e Projetos): se `tipo == "Material TRT"`, gravar `posicao`, `data_producao` e `status_producao` vazios. `peso`, `volume` e `veiculo` são **sempre** gravados vazios.

Exibição na tabela de itens (`equip-table.tsx`) para tipos material: Posição, Data Prod. e Status Prod. aparecem em texto cinza bem claro (40%), sem badge, e vazio em vez de "—".

### 0.5 Status e badges (fonte: `src/components/badges.tsx`, `src/styles.css`)

Paleta (aprox.): azul primário `#185FA5`; verde (sucesso) ≈ `#22A05A`; âmbar (aviso) ≈ `#F2B233`; vermelho (perigo) ≈ `#D93B30`; linha atrasada ≈ `#FDE9E7` (vermelho bem claro); linha "hoje" ≈ `#FEF6D9` (amarelo bem claro). "Pill" = etiqueta arredondada, texto 11px, negrito.

| Badge | Valor | Estilo |
|---|---|---|
| Status de embarque (`EmbarqueBadge`) | `Expedido` | verde (fundo verde 15%, texto verde) |
| | `Não expedido` | âmbar (fundo âmbar 20%, texto marrom escuro) |
| | `Cancelado` | cinza (fundo cinza, texto cinza) |
| Status de produção (`ProdBadge`) | `OK` | verde |
| | `NOK` | vermelho (fundo vermelho 15%, texto vermelho) |
| | vazio | `—` em cinza |
| Toggle checklist (`StatusToggleBadge`) | `OK` / `NOK` | igual ao status de produção, mas clicável |
| Atraso (`LateBadge`) | `{n}d atraso` | vermelho **sólido**, texto branco |
| Hoje (`TodayBadge`) | `hoje` | âmbar **sólido**, texto escuro |
| Tipo (`TipoBadge`) | ver 0.4 | |
| Aprovação (Admin) | `Pendente` / `Aprovado` / `Rejeitado` | âmbar / verde / vermelho |
| Papel (Admin) | `Admin` (com ícone de escudo) / `Usuário` | azul claro / cinza |
| Situação (Faturamento) | `Faturado` / `Futuro` | verde / âmbar |

### 0.6 Ordenação por cabeçalho (fonte: `src/hooks/useSort.ts`, `src/components/sortable-header.tsx`)

Usada na tabela de itens do Dashboard.
- Clique simples numa coluna: sem ordem → crescente → decrescente → sem ordem (ciclo). Ordena só por essa coluna.
- **Shift+clique**: adiciona a coluna como critério secundário (crescente → decrescente → remove). Com 2+ critérios, cada cabeçalho ativo mostra o número da prioridade (1, 2, …).
- Cabeçalho ativo: negrito azul + seta ↑ (crescente) ou ↓ (decrescente). Inativo: ícone ↕ aparece só ao passar o mouse.
- Dica (tooltip): "Clique para ordenar · Shift+Clique para ordenação múltipla".
- Vazios sempre no final, em qualquer direção.
- Tipos: `posicao`, `valor_unitario`, `quantidade` numéricos; `data_producao`, `data_faturamento`, `data_embarque` como data; demais como texto em português (ordem alfabética pt-BR). Projeto ordena pelo nome do projeto.

### 0.7 Seleção múltipla (fonte: `src/components/multi-select.tsx`)

Usada nos filtros do Faturamento. Rótulo pequeno acima; botão com o texto da seleção e seta. Ao abrir: primeira linha "Todos …" (marcada quando tudo está selecionado) + uma caixa por opção. Regras:
- Não é possível desmarcar a última opção marcada (sempre ≥ 1 selecionada).
- Clicar em "Todos …" quando tudo está marcado deixa **só a primeira opção**; quando não está tudo marcado, marca todas.
- Texto do botão: o rótulo "Todos …" se tudo marcado; senão os rótulos selecionados separados por vírgula.
- Clicar fora fecha a lista.

---

## 1. Login / cadastro (fonte: `src/routes/auth.tsx`, `src/routes/index.tsx`)

- Endereço `/` redireciona para o Dashboard (`index.tsx`).
- Título da aba do navegador: "Entrar — Embarques".
- Cabeçalho: ícone de caixa (pacote) em quadrado azul + "Embarques" + " / Guntner" (cinza).
- Cartão central com dois modos:
  - **Entrar**: título "Entrar", subtítulo "Acompanhe prazos de embarque por projeto.", botão "Entrar".
  - **Solicitar acesso**: título "Solicitar acesso", subtítulo "Novas contas precisam ser aprovadas por um administrador.", botão "Solicitar acesso".
- Campos: "E-mail" (obrigatório, tipo e-mail) e "Senha" (obrigatória, mínimo 6 caracteres).
- Botão mostra "Aguarde…" enquanto processa (desabilitado).
- Link inferior alterna o modo: "Não tem conta? Solicitar acesso" / "Já tem conta? Entrar" (limpa mensagens).
- Cadastro com sucesso: mensagem verde "Cadastro recebido. Sua conta precisa ser aprovada por um administrador antes do primeiro acesso.", volta ao modo Entrar e limpa a senha. Conta nasce `pending`.
- Login: 
  - `pending` (ou sem perfil): desloga e mostra em vermelho "Sua conta ainda não foi aprovada pelo administrador."
  - `rejected`: desloga e mostra "Seu acesso foi rejeitado. Entre em contato com o administrador."
  - `approved`: vai para o Dashboard.
  - Erro de autenticação: mostra a mensagem do erro em vermelho.
- Se a pessoa abrir a tela de login já logada e aprovada, vai direto para o Dashboard.

> No Base44 o login/cadastro é nativo. Reproduza as **mensagens** e o **bloqueio** numa "tela de acesso pendente" (seção 2).

## 2. Acesso pendente / bloqueio (fonte: `src/routes/_authenticated/route.tsx`, `src/routes/auth.tsx`)

- Toda página interna exige: usuário logado E `approval_status == approved`. Senão o original desloga e volta ao login.
- No Base44: mostrar uma tela sem dados com:
  - `pending`: "Sua conta ainda não foi aprovada pelo administrador." + texto "Cadastro recebido. Sua conta precisa ser aprovada por um administrador antes do primeiro acesso."
  - `rejected`: "Seu acesso foi rejeitado. Entre em contato com o administrador."
  - Botão "Sair".
- O papel admin é verificado ao entrar (`isAdmin`) e controla a aba Admin.

## 3. Layout e menu (fonte: `src/components/top-bar.tsx`, `src/routes/_authenticated/route.tsx`)

- Barra superior fixa no topo (branca, borda inferior), conteúdo com largura máxima 1400px.
- Esquerda: ícone pacote em quadrado azul + "Embarques" + " / Guntner" (cinza).
- Abas, nesta ordem: "Dashboard", "Faturamento", "Projetos", "Novo projeto" e — **só para admin** — "Admin".
- Aba ativa: texto azul com sublinhado azul de 2px; inativas cinza (escurecem no hover).
- Direita: botão "Sair" com ícone de saída → desloga e vai para o login.
- Área de conteúdo: largura máxima 1400px, margens laterais 24px, topo 24px.
- Dicas (tooltips) aparecem após 200 ms.
- Títulos da aba do navegador: "Dashboard — Embarques", "Faturamento — Embarques", "Projetos — Embarques", "Novo projeto — Embarques", "Admin — Embarques".

## 4. Projetos (fonte: `src/routes/_authenticated/projetos.tsx`, `src/components/equip-editor.tsx`)

### 4.1 Cabeçalho e filtro
- Título "Projetos"; subtítulo: Clique em "Editar" para ver e editar os equipamentos de um projeto.
- À direita: grupo de 3 botões exclusivos (sempre um ativo): **"Em aberto"** (padrão) | "Fechados" | "Todos".
  - Em aberto: `concluido == false`. Fechados: `concluido == true`. Todos: sem filtro.

### 4.2 Estados
- Carregando: "Carregando…".
- Erro: caixa vermelha com "Não foi possível carregar os projetos.", a mensagem do erro e botão "Tentar novamente" (ícone de recarregar).
- Nenhum projeto no sistema: caixa tracejada 'Nenhum projeto ainda. Crie um na aba "Novo projeto".'
- Existem projetos mas nenhum no filtro: "Nenhum projeto nesse filtro."

### 4.3 Cards
- Grade responsiva: 1 coluna (celular), 2 (≥640px), 3 (≥1024px), 4 (≥1280px).
- Ordem: ordem de criação (mais antigo primeiro).
- Card: nome do projeto (negrito) e cliente (cinza) + botões:
  - "Editar" (ícone lápis) → abre o modo edição.
  - "Concluir" (ícone check) quando aberto / "Reabrir" (ícone recarregar, estilo âmbar) quando concluído → inverte `concluido` e recarrega a lista (o card some do filtro atual se não couber mais). Desabilitado enquanto grava. Erro → alerta com a mensagem.
  - "Excluir" (ícone lixeira, vermelho) → confirmação `Excluir projeto "{name}"?` → exclui projeto **e em cascata** todos os itens e cargas. Erro → alerta.

### 4.4 Modo edição (card ocupa a linha inteira)
- Botões do card somem; aparecem:
  - Campos "Projeto" (`name`) e "Cliente" (`client`).
  - Pills de resumo (calculadas sobre os itens **gravados** do projeto, todos os tipos):
    - "{total} equip." (cinza) — sempre;
    - "{n} atrasados" (vermelho) — só se n > 0 — regra Atrasado;
    - "{n} prox. 30d" (âmbar) — só se n > 0 — regra Próximos 30 dias (sem os atrasados);
    - "{n} expedidos" (verde) — só se n > 0 — `status_embarque == "Expedido"`.
  - Barra "Ordenar por:" com botões "Posição" e "Data Embarque" (reordenam as linhas do formulário; não gravam ordem).
  - Formulário de itens (seção 6), já **ordenado por Posição** ao abrir.
  - Botões: "Salvar" (ícone disquete; "Salvando…" durante), "Cancelar" (ícone X; descarta alterações e fecha), "+ Nova linha" (adiciona linha vazia; o formulário também tem o próprio "Nova linha").
- Salvar:
  1. Atualiza `name` e `client` do projeto (sem validação de vazio).
  2. Itens que existiam e foram removidos do formulário → excluídos (e suas cargas).
  3. Cada linha: atualiza (se já existia) ou cria (se nova, com `project_id` do projeto) com os campos `equipamento, posicao, valor_unitario, quantidade, data_producao, status_producao, data_embarque, status_embarque, tipo, data_faturamento, frete, observacao, nota`; `peso`, `volume`, `veiculo` = vazio; regra Material TRT da seção 0.4. **`romaneio`, `painel`, `custo`, `fluxo` não são enviados** (preservados na atualização; `NOK` em itens novos).
  4. Fecha a edição e recarrega. Erro → alerta com a mensagem (a edição continua aberta).

## 5. Novo projeto (fonte: `src/routes/_authenticated/novo.tsx`, `src/components/equip-editor.tsx`)

- Título "Novo projeto"; subtítulo "Cadastre um projeto e seus equipamentos."
- Cartão com "Nome do projeto" (obrigatório, exemplo "Ex: B5000572") e "Cliente" (obrigatório, exemplo "Ex: Kamesq").
- Subtítulo "Equipamentos" + formulário de itens (seção 6) **sem** a barra "Ordenar por", iniciando com **1 linha vazia**.
- Erro: caixa vermelha com a mensagem (padrão "Erro ao salvar.").
- Botões: "Salvar projeto" ("Salvando…" durante) e "Cancelar" (vai para Projetos sem gravar).
- Salvar: cria o Project (`concluido = false`), cria todas as linhas como Equipment (mesmos campos e regras do 4.4 passo 3, checklist = `NOK`), vai para a tela Projetos. Linhas com descrição vazia também são gravadas (não há validação por linha).

## 6. Formulário de itens (compartilhado por Novo projeto e Projetos) (fonte: `src/components/equip-editor.tsx`)

Tabela com rolagem (altura máx. 600px), cabeçalho fixo; colunas "Equipamento" e "Tipo" congeladas à esquerda na rolagem horizontal.

| Coluna | Campo | Controle | Regras |
|---|---|---|---|
| Equipamento | `equipamento` | texto multilinha (2 linhas, redimensionável) | largura 280px |
| Tipo | `tipo` | lista: Equipamento, Material, Material TRT, Serviço | regras de troca (0.4) |
| Posição | `posicao` | texto | desabilitado se tipo ≠ Equipamento |
| Valor | `valor_unitario` | número, passo 0,01 | |
| Qtd | `quantidade` | número, mínimo 1 | |
| Data Prod. | `data_producao` | data | desabilitado se tipo ≠ Equipamento |
| Status Prod. | `status_producao` | lista OK / NOK | desabilitado se tipo ≠ Equipamento |
| Data Faturamento | `data_faturamento` | data | |
| Data Embarque | `data_embarque` | data | |
| Status Embarque | `status_embarque` | lista: Não expedido, Expedido, Cancelado | |
| Frete | `frete` | lista: "—" (vazio), CIF, FOB | |
| Link | `observacao` | texto multilinha | vazio = null |
| Obs | `nota` | texto multilinha | vazio = null |
| (sem título) | — | botão lixeira "Remover" | remove a linha do formulário |

- Linha nova (padrões): `equipamento ""`, `posicao ""`, `valor_unitario 0`, `quantidade 1`, `data_producao` vazia, `status_producao NOK`, `data_embarque` vazia, `status_embarque Não expedido`, `tipo Equipamento`, `data_faturamento` vazia, `frete` vazio, `observacao`/`nota` vazias, `romaneio/painel/custo/fluxo NOK`.
- Botão "Nova linha" (tracejado, ícone +) abaixo da tabela.
- Formulário vazio: "Sem equipamentos. Adicione uma linha."
- Ordenar por Posição: numérica crescente; posições vazias ou não numéricas no final.
- Ordenar por Data Embarque: crescente; vazias no final.

## 7. Dashboard (fonte: `src/routes/_authenticated/dashboard.tsx`, `src/components/equip-table.tsx`, `src/components/badges.tsx`)

### 7.1 Topo
- Título "Dashboard"; subtítulo "Visão geral dos embarques."
- Dois cartões-botão de janela (um ativo por vez; ativo com borda azul e fundo azul 10%):
  - "Próximos 10 dias" com o número = quantidade de itens **distintos** que estão (Atrasados ∪ Próximos 10 dias), de todos os tipos, de todos os projetos.
  - "Próximos 30 dias" (**padrão**) com o número = itens distintos em (Atrasados ∪ Próximos 30 dias).
  - Os números **não** mudam com a busca.
- Campo de busca à direita: placeholder "Buscar por cliente ou projeto…". Filtra as tabelas por `client` OU `name` do projeto contendo o termo, **sem diferenciar maiúsculas/minúsculas nem acentos**, ignorando espaços nas pontas.
- Legenda: "Legenda:" + quadradinho vermelho-claro "Atrasado" + amarelo-claro "Embarque hoje" + branco com borda "Dentro do prazo".
- Projetos concluídos **continuam** aparecendo no Dashboard (o filtro de concluído só existe na tela Projetos).
- Dados de exemplo: no original, se não existir nenhum projeto, o Dashboard cria automaticamente o projeto de exemplo "B5000572"/"Kamesq" com 3 itens (fonte `src/lib/seed.ts`). **Não reproduzir no Base44** (os dados reais serão importados) — registrado só para completude.

### 7.2 Seções (duas tabelas)
Janela 10 dias:
- "MATERIAIS — PRÓXIMOS 10 DIAS": itens do grupo material que estão Atrasados ou nos Próximos 10 dias.
- "EQUIPAMENTOS — PRÓXIMOS 10 DIAS": itens `tipo == Equipamento` Atrasados ou nos Próximos 10 dias.
- Vazio: "Nada nos próximos 10 dias."

Janela 30 dias:
- "MATERIAIS — PRÓXIMOS 30 DIAS (INCLUI ATRASADOS)" e "EQUIPAMENTOS — PRÓXIMOS 30 DIAS (INCLUI ATRASADOS)", mesma lógica com 30 dias.
- Vazio: "Nada nos próximos 30 dias."

Com busca ativa e nada encontrado: `Nenhum item encontrado para "{busca}"`. Carregando: "Carregando…". (Títulos de seção em maiúsculas pequenas, cinza.)

Cada item aparece uma única vez por tabela.

### 7.3 Tabela de itens do Dashboard
- Cabeçalho fixo; altura máxima 520px com rolagem; colunas de expansão, Projeto (175px), Equipamento (220px) e Tipo **congeladas** à esquerda (sombra à direita da coluna Tipo).
- Ordenação padrão: **Data Embarque crescente** (o usuário pode mudar clicando nos cabeçalhos, ver 0.6).
- Cor da linha: Atrasado → vermelho-claro; Embarque hoje → amarelo-claro; senão normal (hover cinza claro).

Colunas (ordem exata) e visibilidade por seção:

| # | Coluna | Campo | Ordenável | Materiais | Equipamentos | Conteúdo |
|---|---|---|---|---|---|---|
| 1 | (seta) | — | não | sim | sim (vazia) | Seta ▸/▾ "Cargas" só em itens do grupo material |
| 2 | Projeto | `project.name` | sim | sim | sim | nome (negrito) + cliente (cinza, menor) |
| 3 | Equipamento | `equipamento` | sim | sim | sim | até 2 linhas; texto completo no tooltip |
| 4 | Tipo | `tipo` | sim | sim | sim | TipoBadge |
| 5 | Posição | `posicao` | sim | **oculta** | sim | valor ou "—" |
| 6 | Valor | `valor_unitario` | sim | sim | sim | moeda; se o item tem cargas: **soma de Carga.valor** |
| 7 | Qtd | `quantidade` | sim | sim | sim | |
| 8 | Data Prod. | `data_producao` | sim | **oculta** | sim | data ou "—" |
| 9 | Status Prod. | `status_producao` | sim | **oculta** | **oculta** | ProdBadge |
| 10 | Data Faturamento | `data_faturamento` | sim | sim | sim | data ou "—" |
| 11 | Data Embarque | `data_embarque` | sim | sim | sim | data + badge "{n}d atraso" (se atrasado) ou "hoje" |
| 12 | Frete | `frete` | não | sim | sim | CIF/FOB ou "—" |
| 13 | Romaneio | `romaneio` | não | sim | sim | toggle OK/NOK |
| 14 | Painel | `painel` | não | sim | sim | toggle OK/NOK |
| 15 | Custo | `custo` | não | sim | **oculta** | toggle OK/NOK |
| 16 | Fluxo | `fluxo` | não | sim | sim | toggle OK/NOK |
| 17 | Peso | — | não | **oculta** | **oculta** | (sempre "—" quando visível) |
| 18 | Volume | — | não | **oculta** | **oculta** | (sempre "—") |
| 19 | Veículo | — | não | **oculta** | **oculta** | (sempre "—") |
| 20 | Link | `observacao` | não | sim | sim | campo editável + botão copiar |
| 21 | Obs | `nota` | não | sim | sim | campo editável |
| 22 | Status Embarque | `status_embarque` | sim | sim | sim | lista editável |

### 7.4 Edições no Dashboard (todas imediatas, sem botão salvar)
- **Toggles Romaneio / Painel / Custo / Fluxo**: clicar no pill alterna `OK` ↔ `NOK` e grava no Equipment na hora (a tela atualiza antes da resposta; se der erro, volta ao valor anterior e mostra alerta com a mensagem).
- **Status Embarque**: lista Não expedido / Expedido / Cancelado; ao trocar grava na hora (mesma lógica de erro). Ao virar Expedido/Cancelado o item sai da tabela (deixa de estar atrasado/na janela).
- **Link** (`observacao`): campo de texto (128px). Grava **ao sair do campo**, só se mudou; vazio grava null. Botão copiar (ícone de cópia, dica "Copiar observação") copia o texto atual; o ícone vira ✓ verde por 2 s. Erro → alerta.
- **Obs** (`nota`): campo de texto; grava ao sair do campo, só se mudou; vazio = null. Erro → alerta.

### 7.5 Cargas (só itens do grupo material, só no Dashboard)
- A seta na 1ª coluna expande/recolhe uma sub-linha de largura total abaixo do item.
- Sub-linha lista as cargas do item (ordem de criação), cada uma com campos editáveis: "Descrição" (texto), "Valor" (número 0,01), "Peso" (número 0,01), "Volume" (número 0,01), "Veículo" (texto) + botão **Salvar** (disquete; dica "Salvar carga") + botão **Remover** (lixeira; dica "Remover carga").
  - Salvar: grava os 5 campos (vazios de peso/volume/veículo = null; valor inválido = 0). Após sucesso o ícone vira ✓ verde por 1,5 s. Em erro: ícone fica vermelho, dica "Falha ao salvar — tente novamente", o que foi digitado é mantido e aparece alerta.
  - Remover: confirmação "Tem certeza que deseja excluir esta carga?" → exclui.
- Sem cargas e sem rascunhos: "Nenhuma carga cadastrada."
- Botão "Nova carga" (tracejado, ícone +) → **modo rascunho**: adiciona uma linha local (Descrição vazia, Valor "0", Peso/Volume/Veículo vazios) que **não é gravada** até clicar em Salvar. Pode haver vários rascunhos. Botão lixeira do rascunho (dica "Descartar rascunho") descarta sem gravar. Salvar cria a Carga; em sucesso o rascunho some e a carga aparece na lista; em erro o rascunho fica (ícone vermelho) e aparece alerta.
- **Regra de valor**: depois de criar, alterar ou excluir uma carga, gravar `Equipment.valor_unitario = soma de Carga.valor de todas as cargas daquele item` (se não sobrar nenhuma carga, fica 0). A coluna Valor do Dashboard mostra essa soma.
- Mensagem padrão de erro: "Erro ao salvar carga".

### 7.6 O que só o Dashboard habilita (a tabela é compartilhada no original)
O componente de tabela (`equip-table.tsx`) tem chaves que só o Dashboard liga: `editableCargas` (seta + cargas + valor = soma das cargas), `editableStatusFields` (colunas Romaneio/Painel/Custo/Fluxo), `editableObs` (Link editável), `editableNota` (Obs editável), `editableStatusEmbarque` (lista de status), `stickyHeader` + `maxHeight 520px`, `defaultSort` (Data Embarque crescente) e `hiddenColumns` por seção. Sem essas chaves a tabela mostra Link/Obs só leitura (texto truncado com tooltip; Link com botão copiar), Status Embarque como badge, e não mostra as colunas de checklist. **No app atual nenhuma outra tela usa essa tabela**; no Base44 basta implementar a versão do Dashboard.

## 8. Faturamento (fonte: `src/routes/_authenticated/faturamento.tsx`, `src/components/multi-select.tsx`)

### 8.1 Conceitos
- Considera **todos** os itens de **todos** os projetos (inclusive projetos concluídos) que têm `data_embarque` preenchida e `status_embarque ≠ Cancelado` ("itens base").
- **Faturado** = `Expedido`. **Futuro** = `Não expedido`. Mês/ano vêm de `data_embarque` (não de `data_faturamento`).
- Valor de cada item = subtotal = `valor_unitario × quantidade`.
- Texto do topo: "Faturamento" + "Faturado = itens **Expedido**. Futuro = ainda não expedidos (sempre exibidos com 50% de transparência). Itens cancelados ficam de fora."
- Carregando: "Carregando…".

### 8.2 Alerta de itens sem valor
Se existir algum item (qualquer projeto, sem filtros) com `status_embarque == Expedido` e `valor_unitario` vazio ou 0: faixa âmbar com ícone de alerta: "{n} item(s) com status **Expedido** estão sem valor unitário — o faturamento pode estar subestimado."

### 8.3 Filtros (seleção múltipla, seção 0.7) + checkbox
| Filtro | Opções | Padrão | Regra |
|---|---|---|---|
| "Ano" (todos = "Todos os anos") | anos de `data_embarque` dos itens não cancelados, em ordem decrescente | todos os anos | ano de `data_embarque` ∈ seleção |
| "Projeto" ("Todos os projetos") | um por projeto, **rótulo = nome do cliente** (`client`), valor = id do projeto | todos | `project_id` ∈ seleção |
| "Mês" ("Todos os meses") | Jan…Dez (valores 01…12) | os meses que têm itens no carregamento | mês de `data_embarque` ∈ seleção |
| "Tipo" ("Todos os tipos") | Equipamento, Material, Material TRT, Serviço (ver nota) | todos os 4 | `tipo` ∈ seleção |
| checkbox "Mostrar faturamento futuro" | — | desmarcado | inclui itens Não expedidos |

Nota sobre o filtro Tipo: no código original a lista mostra só 3 opções (sem "Serviço"), mas o padrão inclui Serviço e o gráfico tem fatias de Serviço. No Base44 **inclua as 4 opções** (correção da inconsistência).

"Itens filtrados" = itens base que passam em Ano, Projeto, Tipo e Mês.

### 8.4 Totais e gráfico de pizza
- `faturado` = soma dos subtotais dos itens filtrados `Expedido`.
- `futuro` = soma dos subtotais dos itens filtrados `Não expedido`.
- `total` = `faturado + futuro` se "Mostrar faturamento futuro" marcado; senão `faturado`.
- Número grande azul = `total`; abaixo "Total do filtro selecionado".
- Pizza (200×200, começa no topo, sentido horário) com fatias na ordem:
  1. "Equipamento — Faturado" `#185FA5`
  2. "Material — Faturado" `#D97706`
  3. "Material TRT — Faturado" `#7C3AED`
  4. "Serviço — Faturado" `#0D9488`
  5–8. (só com futuro marcado) "Equipamento — Futuro", "Material — Futuro", "Material TRT — Futuro", "Serviço — Futuro" com as mesmas cores a **50% de opacidade**.
  - Cada fatia = soma dos subtotais dos itens filtrados daquele tipo e situação. Fatias com valor 0 não aparecem.
- Legenda ao lado: quadradinho da cor, rótulo, percentual `round(valor/total×100)%` e valor em moeda.
- Sem dados: círculo cinza "Sem dados" e texto "Sem dados para este filtro."

### 8.5 Meta anual
- Campo numérico "META DE FATURAMENTO ({ano})" — `{ano}` = o ano quando **exatamente um** ano está selecionado; senão o texto "ano" e o campo fica desabilitado.
- Valor inicial = `MetaFaturamento.valor` do ano (vazio se 0/inexistente).
- **Grava ao sair do campo** (upsert por `ano`: atualiza o registro do ano ou cria; valor inválido = 0). Erro → alerta.
- `faturadoDoAno` = soma dos subtotais de **todos** os itens base `Expedido` com ano de `data_embarque` = ano selecionado (**ignora** filtros de Projeto, Mês, Tipo e a checkbox de futuro).
- `% = min(100, faturadoDoAno / meta × 100)` (0 se meta = 0). `falta = max(0, meta − faturadoDoAno)`. `atingida = meta > 0 E faturadoDoAno ≥ meta`.
- Barra de progresso (altura 20px, arredondada): largura = %; cor **verde** enquanto não atingida, **azul** quando atingida.
- Texto abaixo:
  - nenhum ano único: "Selecione um ano específico para definir a meta."
  - meta 0: "Defina uma meta para acompanhar o progresso."
  - atingida (azul): "Meta atingida — {faturadoDoAno} de {meta}"
  - senão: "Faturado **{faturadoDoAno}** de **{meta}** — {round(%)}% da meta · faltam **{falta}**"

### 8.6 Faturamento mês a mês
- Título "Faturamento mês a mês"; subtítulo "Faturado (sólido) e futuro (50% transparência) ao longo do ano selecionado."
- Sem ano único: "Selecione um ano específico para visualizar o gráfico mensal."
- Com ano único: 12 colunas Jan…Dez. Para cada item filtrado do ano: `Expedido` soma em "fat" do mês; senão (Não expedido) soma em "fut" do mês **só se** futuro marcado.
- Barra empilhada: fat em `#185FA5` sólido embaixo, fut em `#185FA5` 50% em cima. Altura = valor / max(1, maior total mensal) × 180px. Acima da barra, o total do mês em moeda (só se > 0). Abaixo, o nome do mês.

### 8.7 Detalhamento
- Título "Detalhamento"; botão "Exportar XLSX" (ícone download); subtítulo "Itens que compõem os valores acima, conforme os filtros selecionados."
- Caixas: "FATURADO (EXPEDIDO)" (verde) = faturado; "FATURAMENTO FUTURO" (âmbar) = futuro, **só com futuro marcado**; "TOTAL DO FILTRO" (azul) = total.
- Linhas = itens filtrados (só `Expedido`, ou `Expedido` + `Não expedido` se futuro marcado), em ordem de criação.
- Colunas: Projeto (nome + cliente), Equipamento (2 linhas), Tipo (badge), POS (`posicao` ou "—"), Qtd, Valor Un (moeda), Subtotal (moeda, negrito), Data Embarque, Data Fat., Status (EmbarqueBadge), Situação ("Faturado" verde / "Futuro" âmbar).
- Linhas não expedidas com 50% de opacidade.
- Linha final "Total" (negrito, fundo cinza) com `total` na coluna Subtotal.
- Vazio: "Nenhum item para os filtros selecionados."

### 8.8 Exportação XLSX
- Linhas exportadas = as mesmas do Detalhamento.
- Aba **"Equipamentos"** (itens `tipo == Equipamento`), colunas: Projeto, Cliente, Equipamento, Tipo, Posição (número se for numérica, senão texto), Qtd, Valor Unitário, Subtotal, Data Faturamento, Data Embarque, Status, Situação ("Faturado" se Expedido, senão "Futuro").
- Aba **"Materiais"** (grupo material), colunas: Projeto, Cliente, Descrição (= `equipamento`), Tipo, Qtd, Valor Unitário, Subtotal, Data Faturamento, Data Embarque, Frete, Peso (kg), Volume (m³), Observação (= `observacao`), Status, Situação.
- Datas como data real do Excel no formato `dd/mm/yyyy` (vazias ficam em branco). Valores numéricos. Largura das colunas automática (máx. 50 caracteres).
- Nome do arquivo: `faturamento_{anos}_{meses}.xlsx`
  - `{anos}` = "todos" se todos os anos disponíveis (ou nenhum) estão selecionados; senão os anos selecionados em ordem crescente unidos por "-" (ex.: `2025-2026`).
  - `{meses}` = "todos" se os 12 meses (ou nenhum) estão selecionados; senão os números com 2 dígitos em ordem unidos por "-" (ex.: `01-02-03`).
  - Ex.: `faturamento_2026_todos.xlsx`, `faturamento_todos_03-04.xlsx`.

## 9. Admin (fonte: `src/routes/_authenticated/admin.tsx`)

- Só para `role == admin`; outros são redirecionados ao Dashboard.
- Título "Administração de usuários"; subtítulo "Aprove novos cadastros e gerencie permissões. Todos os usuários aprovados compartilham a mesma base de dados."
- Carregando: "Carregando…".
- Seção "AGUARDANDO APROVAÇÃO ({n})": usuários `pending`. Vazio: "Nenhum cadastro pendente."
- Seção "USUÁRIOS ({n})": usuários `approved` e `rejected`. Vazio: "Nenhum usuário."
- Ordem: cadastro mais recente primeiro.
- Colunas: E-mail (negrito), Status (Pendente/Aprovado/Rejeitado), Papel (Admin com ícone de escudo / Usuário), Cadastro (data dd/mm/aaaa), Ações (à direita).
- Ações:
  - "Aprovar" (verde, ícone ✓): aparece para pendentes e rejeitados → `approval_status = approved`.
  - "Rejeitar" (vermelho, ícone X): aparece para quem não está rejeitado → `approval_status = rejected`.
  - "Tornar admin" / "Remover admin": só para aprovados → `role = admin` / `role = user`.
  - Erro → alerta com a mensagem. Após cada ação a lista recarrega.
- Não há proteção contra o admin rejeitar ou rebaixar a si mesmo (comportamento original).

---

## 10. Checklist de validação (TODOS os recursos)

Use esta lista para conferir o Base44. Entre parênteses: arquivo de origem no app original.

### Acesso e layout
1. `/` abre o Dashboard (`src/routes/index.tsx`).
2. Cadastro com e-mail + senha (mín. 6) cria usuário `pending` (`src/routes/auth.tsx`, migration `20260623104842`).
3. Mensagem de cadastro recebido "Cadastro recebido. Sua conta precisa ser aprovada…" (`src/routes/auth.tsx`).
4. Usuário `pending` é bloqueado com "Sua conta ainda não foi aprovada pelo administrador." (`src/routes/auth.tsx`, `src/routes/_authenticated/route.tsx`).
5. Usuário `rejected` é bloqueado com "Seu acesso foi rejeitado. Entre em contato com o administrador." (`src/routes/auth.tsx`).
6. Usuário aprovado entra e cai no Dashboard (`src/routes/auth.tsx`).
7. Tela de bloqueio tem botão Sair e não carrega dados (`src/routes/_authenticated/route.tsx`).
8. Usuário comum não consegue alterar o próprio `approval_status` nem `role` (migration `20260623104842`, policies de profiles/user_roles).
9. Usuário não aprovado não lê nem grava nenhuma entidade (migrations `20260623104842`, `20260708120000`).
10. Todos os aprovados veem os mesmos dados (sem filtro por criador) (migration `20260623104842`).
11. Barra superior com logo "Embarques / Guntner" (`src/components/top-bar.tsx`).
12. Abas na ordem Dashboard, Faturamento, Projetos, Novo projeto (`src/components/top-bar.tsx`).
13. Aba Admin só para admin (`src/components/top-bar.tsx`).
14. Aba ativa em azul com sublinhado (`src/components/top-bar.tsx`).
15. Botão "Sair" desloga (`src/components/top-bar.tsx`).
16. Página Admin redireciona não-admin para o Dashboard (`src/routes/_authenticated/admin.tsx`).
17. Conteúdo com largura máx. 1400px (`src/routes/_authenticated/route.tsx`).

### Formatos e regras globais
18. Moeda no formato `R$ 185 000,00` (`src/lib/embarques.ts`).
19. Datas `DD/MM/AAAA`, vazio "—" (`src/lib/embarques.ts`).
20. Regra Atrasado (`src/lib/embarques.ts` `isLate`).
21. Regra Embarque hoje (`src/lib/embarques.ts` `isToday`).
22. Regra Próximos 10 dias (`src/lib/embarques.ts` `isNext10`).
23. Regra Próximos 30 dias (`src/lib/embarques.ts` `isNext30`).
24. Subtotal = valor_unitario × quantidade (`src/lib/embarques.ts`).
25. Grupo material = Material, Material TRT, Serviço (`src/lib/embarques.ts` `isTipoMaterial`).
26. Badges de tipo com as 4 cores (`src/components/badges.tsx`).
27. Badges de status de embarque verde/âmbar/cinza (`src/components/badges.tsx`).
28. Badges de status de produção OK verde / NOK vermelho / vazio "—" (`src/components/badges.tsx`).
29. Badge "{n}d atraso" vermelho sólido (`src/components/badges.tsx`).
30. Badge "hoje" âmbar sólido (`src/components/badges.tsx`).

### Projetos
31. Título/subtítulo da tela Projetos (`src/routes/_authenticated/projetos.tsx`).
32. Filtro Em aberto (padrão) / Fechados / Todos por `concluido` (`projetos.tsx`).
33. Estados Carregando, erro com "Tentar novamente", vazio total e vazio do filtro (`projetos.tsx`).
34. Cards em grade 1/2/3/4 colunas, ordem de criação (`projetos.tsx`).
35. Card com nome e cliente (`projetos.tsx`).
36. Botão Editar abre edição em largura total (`projetos.tsx`).
37. Botão Concluir/Reabrir alterna `concluido` (Reabrir em âmbar) (`projetos.tsx`, migration `20260824120000`).
38. Botão Excluir com confirmação `Excluir projeto "{name}"?` (`projetos.tsx`).
39. Exclusão do projeto apaga itens e cargas em cascata (migrations `20260619180938`, `20260708120000`).
40. Edição de nome e cliente (`projetos.tsx`).
41. Pills "{n} equip.", "{n} atrasados", "{n} prox. 30d", "{n} expedidos" (`projetos.tsx`).
42. Barra "Ordenar por: Posição | Data Embarque" (`src/components/equip-editor.tsx`).
43. Linhas abrem ordenadas por Posição (`projetos.tsx`).
44. Salvar atualiza/cria/exclui itens (exclusão leva as cargas) (`projetos.tsx`).
45. Salvar preserva romaneio/painel/custo/fluxo (`projetos.tsx`).
46. Cancelar descarta alterações (`projetos.tsx`).
47. Botão "+ Nova linha" no rodapé da edição (`projetos.tsx`).
48. Projeto concluído continua no Dashboard e no Faturamento (`dashboard.tsx`, `faturamento.tsx`, migration `20260824120000`).

### Novo projeto
49. Campos Nome do projeto e Cliente obrigatórios com exemplos (`src/routes/_authenticated/novo.tsx`).
50. Formulário começa com 1 linha (`novo.tsx`).
51. Salvar cria projeto + itens e vai para Projetos (`novo.tsx`).
52. Cancelar volta para Projetos (`novo.tsx`).
53. Mensagem de erro em caixa vermelha (`novo.tsx`).

### Formulário de itens
54. 13 colunas editáveis + remover, na ordem documentada (`equip-editor.tsx`).
55. Equipamento e Tipo congelados à esquerda (`equip-editor.tsx`).
56. Tipo com 4 opções (`equip-editor.tsx`).
57. Posição/Data Prod./Status Prod. desabilitados fora de Equipamento (`equip-editor.tsx`).
58. Trocar para material limpa posição/produção; voltar para Equipamento restaura NOK (`equip-editor.tsx`).
59. Material TRT grava posição/produção vazias (`novo.tsx`, `projetos.tsx`).
60. peso/volume/veiculo gravados vazios (`novo.tsx`, `projetos.tsx`).
61. Frete com "—", CIF, FOB (`equip-editor.tsx`, migration `20260625120000`).
62. Link = `observacao`; Obs = `nota` (`equip-editor.tsx`, migration `20260709100000`).
63. Padrões da linha nova (`equip-editor.tsx` `emptyRow`).
64. Botão "Nova linha" e vazio "Sem equipamentos. Adicione uma linha." (`equip-editor.tsx`).
65. Ordenação por Posição (numérica, vazios no fim) e por Data Embarque (vazios no fim) (`equip-editor.tsx`).

### Dashboard
66. Título/subtítulo (`dashboard.tsx`).
67. Cartão "Próximos 10 dias" com contagem (atrasados ∪ 10 dias, distintos) (`dashboard.tsx`).
68. Cartão "Próximos 30 dias" com contagem, padrão ativo (`dashboard.tsx`).
69. Busca por cliente/projeto sem acento e sem maiúsculas (`dashboard.tsx`).
70. Contagens não mudam com a busca (`dashboard.tsx`).
71. Legenda Atrasado / Embarque hoje / Dentro do prazo (`dashboard.tsx`).
72. Seções Materiais e Equipamentos com títulos de 10 e 30 dias (`dashboard.tsx`).
73. Atrasados aparecem nas duas janelas (`dashboard.tsx`).
74. Mensagens vazias "Nada nos próximos 10/30 dias." e `Nenhum item encontrado para "{busca}"` (`dashboard.tsx`).
75. Linha vermelho-claro (atrasado) / amarelo-claro (hoje) (`equip-table.tsx`).
76. Colunas e visibilidade por seção conforme 7.3 (`equip-table.tsx`, `dashboard.tsx`).
77. Cabeçalho fixo, altura 520px, colunas congeladas (`equip-table.tsx`).
78. Ordenação padrão Data Embarque crescente (`dashboard.tsx`).
79. Ordenação por clique e Shift+clique (multi) com prioridade e vazios no fim (`src/hooks/useSort.ts`, `src/components/sortable-header.tsx`).
80. Projeto mostra nome + cliente (`equip-table.tsx`).
81. Badge "{n}d atraso" / "hoje" na Data Embarque (`equip-table.tsx`).
82. Toggles Romaneio, Painel, Custo (só Materiais), Fluxo gravam na hora (`equip-table.tsx`, `dashboard.tsx`, migrations `20260708130000`, `20260709090000`).
83. Toggle com erro volta ao valor anterior + alerta (`dashboard.tsx`).
84. Status Embarque editável por lista (`equip-table.tsx`, `dashboard.tsx`).
85. Link editável (grava ao sair) + copiar com ✓ por 2 s (`equip-table.tsx`, `dashboard.tsx`).
86. Obs editável (grava ao sair) (`equip-table.tsx`, `dashboard.tsx`).
87. Seta de cargas só em itens do grupo material (`equip-table.tsx`).
88. Lista de cargas com Descrição/Valor/Peso/Volume/Veículo editáveis (`equip-table.tsx`).
89. Salvar carga com ✓ por 1,5 s e estado de erro vermelho (`equip-table.tsx`).
90. Excluir carga com confirmação (`equip-table.tsx`).
91. "Nova carga" em modo rascunho (não grava até Salvar; descartar) (`equip-table.tsx`).
92. "Nenhuma carga cadastrada." (`equip-table.tsx`).
93. Valor do item = soma das cargas (gravado em valor_unitario após cada mudança) (`dashboard.tsx`).
94. Coluna Valor mostra a soma das cargas quando houver cargas (`equip-table.tsx`).
95. Projetos concluídos aparecem no Dashboard (`dashboard.tsx`).
96. (Não reproduzir) dados de exemplo automáticos (`src/lib/seed.ts`).

### Faturamento
97. Texto explicativo do topo (`faturamento.tsx`).
98. Cancelados e itens sem data de embarque excluídos (`faturamento.tsx`).
99. Alerta de itens Expedido sem valor (`faturamento.tsx`).
100. Filtro Ano (padrão todos, ordem decrescente) (`faturamento.tsx`).
101. Filtro Projeto com rótulo = cliente (`faturamento.tsx`).
102. Filtro Mês (padrão = meses com itens) (`faturamento.tsx`).
103. Filtro Tipo com 4 opções (`faturamento.tsx`).
104. Regras do seletor múltiplo (mín. 1, "Todos…") (`src/components/multi-select.tsx`).
105. Checkbox "Mostrar faturamento futuro" (`faturamento.tsx`).
106. Total grande + "Total do filtro selecionado" (`faturamento.tsx`).
107. Pizza com 4 (ou 8) fatias, cores e opacidade 50% no futuro (`faturamento.tsx`).
108. Legenda com % e valor; "Sem dados" (`faturamento.tsx`).
109. Meta anual habilitada só com 1 ano; grava ao sair do campo (upsert por ano) (`faturamento.tsx`, migration `20260622164500`/`20260623104842`).
110. Progresso da meta (fórmulas, cores verde/azul, textos) (`faturamento.tsx`).
111. Faturado do ano ignora filtros de projeto/mês/tipo (`faturamento.tsx`).
112. Gráfico mês a mês (só com 1 ano; empilhado; rótulos) (`faturamento.tsx`).
113. Caixas Faturado / Futuro / Total (`faturamento.tsx`).
114. Tabela Detalhamento com 11 colunas, opacidade 50% no futuro, linha Total (`faturamento.tsx`).
115. Vazio "Nenhum item para os filtros selecionados." (`faturamento.tsx`).
116. Exportar XLSX com abas Equipamentos e Materiais e colunas exatas (`faturamento.tsx`).
117. Datas do XLSX como data dd/mm/yyyy (`faturamento.tsx`).
118. Nome do arquivo `faturamento_{anos}_{meses}.xlsx` (`faturamento.tsx`).
119. Projetos concluídos continuam no Faturamento (`faturamento.tsx`).

### Admin
120. Título/subtítulo (`admin.tsx`).
121. Seção "Aguardando aprovação (n)" e vazio "Nenhum cadastro pendente." (`admin.tsx`).
122. Seção "Usuários (n)" e vazio "Nenhum usuário." (`admin.tsx`).
123. Colunas E-mail, Status, Papel, Cadastro, Ações; ordem mais recente primeiro (`admin.tsx`).
124. Aprovar (pendente/rejeitado), Rejeitar (não rejeitado) (`admin.tsx`).
125. Tornar admin / Remover admin (só aprovados) (`admin.tsx`).
126. Pills de status e papel com cores (`admin.tsx`).

### Dados
127. MetaFaturamento única por ano e compartilhada (migration `20260623104842`).
128. Remover item na edição do projeto apaga as cargas dele (migration `20260708120000`).


---

<!-- ===== Arquivo: 03-prompts-base44.md ===== -->

# 03 — Prompts para o Base44 (colar em ordem)

Cole **um prompt por vez** no chat do Base44, na ordem abaixo. Espere o Base44 terminar, confira os **Critérios de aceite** na tela e só então passe ao próximo. Se algum critério falhar, responda no chat do Base44 com o item que falhou (ex.: "o critério 3 não foi atendido: …").

Ordem: P0 → P1 → P2 → P3 → P4 → P5a → P5b → P5c → P6a → P6b → P7 → P8.

Cada prompt está dentro de um bloco de código: copie o conteúdo inteiro do bloco.

---

## P0 — Criar as entidades

Antes de colar: tenha em mãos os 5 arquivos da pasta `entities/` (Project.json, Equipment.json, Carga.json, MetaFaturamento.json, User.json — também estão no KIT-COMPLETO). Cole o prompt e, logo abaixo dele (na mesma mensagem), cole o conteúdo dos 5 JSON.

```
Crie o modelo de dados deste app usando entidades nativas do Base44 (NÃO use Supabase nem banco externo). Use EXATAMENTE os JSON Schemas que colo abaixo, sem renomear campos, sem traduzir valores de enum e mantendo os defaults:

1. Entidade Project (campos: name, client, concluido, legacy_id, legacy_created_at).
2. Entidade Equipment (campos: project_id, equipamento, tipo, posicao, valor_unitario, quantidade, data_producao, status_producao, data_embarque, status_embarque, data_faturamento, frete, peso, volume, veiculo, observacao, nota, romaneio, painel, custo, fluxo, legacy_id, legacy_project_id, legacy_created_at).
3. Entidade Carga (campos: equipment_id, descricao, valor, peso, volume, veiculo, legacy_id, legacy_equipment_id, legacy_created_at).
4. Entidade MetaFaturamento (campos: ano, valor, legacy_id).
5. Na entidade nativa User, ADICIONE os campos approval_status (enum "pending","approved","rejected", default "pending") e legacy_id. Use o campo nativo role ("admin"/"user") para o papel.

Valores de enum exatos (com acentos e maiúsculas):
- Equipment.tipo: "Equipamento", "Material", "Material TRT", "Serviço" (default "Equipamento")
- Equipment.status_embarque: "Não expedido", "Expedido", "Cancelado" (default "Não expedido")
- Equipment.status_producao, romaneio, painel, custo, fluxo: "OK", "NOK" (default "NOK")
- Equipment.frete: "CIF", "FOB" (opcional)

Relações: Equipment.project_id guarda o id de um Project; Carga.equipment_id guarda o id de um Equipment.

Permissões (aplique em Project, Equipment, Carga e MetaFaturamento): ler, criar, editar e excluir é permitido para QUALQUER usuário logado cujo approval_status seja "approved" — todos os aprovados compartilham todos os registros (NÃO restrinja ao criador). Usuários não aprovados não acessam nada.
Permissões do User: cada usuário lê o próprio registro; admin (role = "admin") lê todos; SOMENTE admin pode alterar approval_status e role de qualquer usuário (o próprio usuário não pode se autoaprovar nem se promover).

Não crie telas ainda. Só as entidades e permissões.

[COLE AQUI OS 5 JSON]
```

**Critérios de aceite**
1. No painel de dados aparecem as entidades Project, Equipment, Carga e MetaFaturamento com todos os campos listados acima.
2. Os enums têm exatamente os valores listados (confira "Não expedido" e "Serviço" com acento).
3. User tem o campo approval_status com default "pending".
4. Seu próprio usuário (dono do app) tem role = admin. Edite manualmente no painel de dados o seu User e coloque approval_status = "approved".
5. As permissões estão como descrito (abrir o painel de segurança de cada entidade e conferir).

---

## P1 — Login, aprovação e papéis

```
Configure o acesso do app "Embarques / Guntner".

Regras:
- O login e o cadastro são os nativos do Base44 (e-mail e senha). Todo usuário novo nasce com User.approval_status = "pending" (default do campo).
- Antes de mostrar QUALQUER página interna, verifique o usuário logado:
  - Se approval_status = "pending": mostre uma tela de bloqueio, sem carregar nenhum dado, com o título "Sua conta ainda não foi aprovada pelo administrador." e o texto "Cadastro recebido. Sua conta precisa ser aprovada por um administrador antes do primeiro acesso."
  - Se approval_status = "rejected": mesma tela de bloqueio com o título "Seu acesso foi rejeitado. Entre em contato com o administrador."
  - As duas telas têm um botão "Sair" que faz logout.
  - Se approval_status = "approved": libera o app.
- O papel vem do campo nativo User.role: "admin" ou "user". Disponibilize um indicador isAdmin (role === "admin") para as próximas telas.
- A página inicial ("/") deve abrir a página Dashboard (pode ser um placeholder com o título "Dashboard" por enquanto).
- Visual da tela de bloqueio: centralizada, cartão branco com borda; acima do cartão um ícone de pacote/caixa num quadrado azul (#185FA5) seguido de "Embarques" e " / Guntner" em cinza.
- Título da aba do navegador na tela de bloqueio: "Entrar — Embarques".
```

**Critérios de aceite**
1. Criar um usuário novo de teste → ele vê a tela "Sua conta ainda não foi aprovada pelo administrador." e não vê dados.
2. No painel de dados, mudar o approval_status dele para "rejected" → ele vê "Seu acesso foi rejeitado. Entre em contato com o administrador."
3. Mudar para "approved" → ele entra e vê a página Dashboard.
4. O botão "Sair" desloga.
5. O usuário de teste (role "user") NÃO consegue mudar o próprio approval_status (tente pela tela/console; deve ser negado).

---

## P2 — Layout e menu

```
Crie o layout comum de todas as páginas internas (somente para usuários com User.approval_status = "approved").

Barra superior fixa no topo (fundo branco, borda inferior fina, altura 56px), conteúdo centralizado com largura máxima 1400px e margens laterais de 24px:
- À esquerda: ícone de pacote/caixa branco dentro de um quadrado azul #185FA5 arredondado (28px) + texto "Embarques" em negrito seguido de " / Guntner" em cinza.
- Abas de navegação, nesta ordem: "Dashboard" (/dashboard), "Faturamento" (/faturamento), "Projetos" (/projetos), "Novo projeto" (/novo). Uma quinta aba "Admin" (/admin) aparece SOMENTE quando User.role = "admin".
- Aba ativa: texto azul #185FA5 com sublinhado azul de 2px na base; abas inativas em cinza, escurecendo ao passar o mouse.
- À direita: botão pequeno "Sair" com ícone de logout, que desloga e volta para o login.

Área de conteúdo: largura máxima 1400px, centralizada, margens de 24px. Tooltips do app aparecem após 200 ms.

Títulos da aba do navegador: "Dashboard — Embarques", "Faturamento — Embarques", "Projetos — Embarques", "Novo projeto — Embarques", "Admin — Embarques".

A página /admin, se aberta por quem não é admin, deve redirecionar para /dashboard.

Crie as 5 páginas como placeholders com o título de cada uma (o conteúdo virá depois).

Estilo geral do app (usar em todas as páginas): fonte sans-serif, fundo da página cinza muito claro, cartões brancos com borda e cantos arredondados. Cores: azul primário #185FA5; verde de sucesso ≈ #22A05A; âmbar de aviso ≈ #F2B233 (texto escuro sobre ele); vermelho de perigo ≈ #D93B30. "Pill" = etiqueta arredondada pequena (texto ~11px, negrito, padding 2px 8px).
```

**Critérios de aceite**
1. Admin vê 5 abas; usuário comum vê 4 (sem Admin).
2. A aba da página atual fica azul e sublinhada.
3. Usuário comum que digita /admin na barra de endereço volta para /dashboard.
4. "Sair" desloga.
5. O título da aba do navegador muda conforme a página.

---

## P3 — Tela Projetos (lista, filtro, concluir, excluir)

```
Implemente a página /projetos ("Projetos") usando as entidades Project, Equipment e Carga.

Cabeçalho: título "Projetos"; subtítulo: Clique em "Editar" para ver e editar os equipamentos de um projeto.
À direita do cabeçalho: grupo de 3 botões exclusivos (sempre um ativo): "Em aberto" (padrão), "Fechados", "Todos".
- Em aberto: Project.concluido = false. Fechados: concluido = true. Todos: sem filtro.

Estados:
- Carregando: "Carregando…".
- Erro ao carregar: caixa vermelha com "Não foi possível carregar os projetos.", a mensagem do erro e botão "Tentar novamente".
- Nenhum Project existente: caixa tracejada com 'Nenhum projeto ainda. Crie um na aba "Novo projeto".'
- Existem projetos mas nenhum passa no filtro: "Nenhum projeto nesse filtro."

Lista: grade de cards (1 coluna no celular, 2 a partir de 640px, 3 a partir de 1024px, 4 a partir de 1280px). Ordem: ordem de criação, mais antigo primeiro — use legacy_created_at quando preenchido, senão created_date.

Cada card (branco, borda, sombra leve): Project.name em negrito, Project.client em cinza abaixo, e 3 botões pequenos com borda:
- "Editar" (ícone lápis) — por enquanto pode não fazer nada (será feito no próximo passo).
- "Concluir" (ícone de check) quando concluido = false; "Reabrir" (ícone de recarregar, borda/fundo âmbar claro) quando concluido = true. Clique inverte Project.concluido, desabilita o botão enquanto grava e recarrega a lista. Erro → alert com a mensagem.
- "Excluir" (ícone lixeira, texto e borda vermelhos): pede confirmação com o texto exato: Excluir projeto "{name}"? Se confirmado, exclui EM CASCATA: primeiro todas as Carga cujo equipment_id pertence a algum Equipment com project_id = id do projeto, depois todos esses Equipment, depois o Project. Erro → alert com a mensagem.

IMPORTANTE: "concluido" serve só para esta tela. Não esconda projetos concluídos em nenhuma outra página.
```

**Critérios de aceite**
1. A tela abre com "Em aberto" selecionado e só mostra projetos com concluido = false.
2. "Concluir" move o projeto para "Fechados"; lá o botão vira "Reabrir" (âmbar) e devolve para "Em aberto".
3. "Todos" mostra os dois tipos.
4. "Excluir" pede `Excluir projeto "…"?`; após confirmar, somem o projeto, seus Equipment e as Cargas deles (conferir no painel de dados).
5. Sem nenhum projeto aparece a mensagem com "Novo projeto"; com filtro sem resultado aparece "Nenhum projeto nesse filtro."

---

## P4 — Formulário de itens + Novo projeto + edição em Projetos

```
Crie um componente reutilizável "Formulário de itens" (editor de linhas da entidade Equipment, ainda não gravadas) e use-o em duas telas.

FORMULÁRIO DE ITENS — tabela com rolagem (altura máxima 600px), cabeçalho fixo; as colunas Equipamento e Tipo ficam congeladas à esquerda na rolagem horizontal. Colunas, nesta ordem:
1. "Equipamento" → campo equipamento: texto multilinha (2 linhas, redimensionável), largura 280px.
2. "Tipo" → tipo: lista com "Equipamento", "Material", "Material TRT", "Serviço".
3. "Posição" → posicao: texto.
4. "Valor" → valor_unitario: número com passo 0,01.
5. "Qtd" → quantidade: número inteiro, mínimo 1.
6. "Data Prod." → data_producao: data.
7. "Status Prod." → status_producao: lista "OK"/"NOK".
8. "Data Faturamento" → data_faturamento: data.
9. "Data Embarque" → data_embarque: data.
10. "Status Embarque" → status_embarque: lista "Não expedido", "Expedido", "Cancelado".
11. "Frete" → frete: lista "—" (vazio), "CIF", "FOB".
12. "Link" → observacao: texto multilinha (vazio = nulo).
13. "Obs" → nota: texto multilinha (vazio = nulo).
14. (sem título) botão lixeira com dica "Remover": remove a linha do formulário.
Regras:
- Posição, Data Prod. e Status Prod. ficam DESABILITADOS (cinza) quando tipo ≠ "Equipamento".
- Ao trocar o tipo para "Material", "Material TRT" ou "Serviço": limpar posicao, data_producao e status_producao (nulo). Ao voltar para "Equipamento": se status_producao estiver vazio, colocar "NOK".
- Linha nova: equipamento "", posicao "", valor_unitario 0, quantidade 1, data_producao vazia, status_producao "NOK", data_embarque vazia, status_embarque "Não expedido", tipo "Equipamento", data_faturamento vazia, frete vazio, observacao e nota vazias.
- Abaixo da tabela: botão tracejado "Nova linha" (ícone +) que adiciona uma linha nova.
- Sem linhas: "Sem equipamentos. Adicione uma linha."
- Opcionalmente (parâmetro), mostrar acima da tabela "Ordenar por:" com os botões "Posição" (ordena as linhas por posicao numérica crescente; vazias ou não numéricas no final) e "Data Embarque" (crescente; vazias no final). Isso só reordena o formulário.

REGRAS DE GRAVAÇÃO de cada linha (usar nas duas telas): gravar equipamento, posicao, valor_unitario, quantidade, data_producao, status_producao, data_embarque, status_embarque, tipo, data_faturamento, frete, observacao, nota; gravar peso, volume e veiculo SEMPRE vazios (nulos); se tipo = "Material TRT", gravar posicao, data_producao e status_producao vazios. NÃO enviar romaneio, painel, custo e fluxo (ficam "NOK" em itens novos e preservados em itens existentes).

TELA /novo ("Novo projeto"): título "Novo projeto", subtítulo "Cadastre um projeto e seus equipamentos." Cartão com dois campos lado a lado: "Nome do projeto" (obrigatório, placeholder "Ex: B5000572") → Project.name; "Cliente" (obrigatório, placeholder "Ex: Kamesq") → Project.client. Abaixo o subtítulo "Equipamentos" e o Formulário de itens SEM a barra de ordenação, começando com 1 linha nova. Erro: caixa vermelha com a mensagem (padrão "Erro ao salvar."). Botões: "Salvar projeto" (azul; mostra "Salvando…" e fica desabilitado enquanto grava) e "Cancelar" (vai para /projetos). Salvar: cria o Project (concluido = false), cria um Equipment por linha com project_id = id do novo projeto (mesmo linhas sem descrição) e vai para /projetos.

TELA /projetos — botão "Editar" do card: o card passa a ocupar a largura inteira da grade, os botões Editar/Concluir/Excluir somem e aparece:
- Campos "Projeto" (Project.name) e "Cliente" (Project.client).
- Pills de resumo calculadas sobre os Equipment JÁ GRAVADOS do projeto (todos os tipos), com hoje = data local AAAA-MM-DD:
  - "{n} equip." (cinza) — total de itens, sempre visível;
  - "{n} atrasados" (fundo vermelho claro, texto vermelho), só se n > 0: status_embarque = "Não expedido" e data_embarque < hoje;
  - "{n} prox. 30d" (fundo âmbar claro), só se n > 0: status_embarque = "Não expedido" e 0 ≤ (data_embarque − hoje em dias) ≤ 30;
  - "{n} expedidos" (fundo verde claro, texto verde), só se n > 0: status_embarque = "Expedido".
- O Formulário de itens COM a barra "Ordenar por", carregado com os Equipment do projeto já ordenados por Posição.
- Botões: "Salvar" (azul, ícone disquete, "Salvando…" enquanto grava), "Cancelar" (ícone X; descarta as alterações e fecha) e "+ Nova linha" (tracejado; adiciona linha nova).
- Salvar: atualiza name e client; para cada Equipment do projeto que foi removido do formulário, exclui antes as Carga dele (equipment_id) e depois o Equipment; atualiza as linhas existentes e cria as novas (project_id = id do projeto), seguindo as REGRAS DE GRAVAÇÃO. Depois fecha a edição e recarrega. Erro → alert com a mensagem e a edição continua aberta.
```

**Critérios de aceite**
1. Em /novo, trocar o tipo de uma linha para "Material" desabilita e limpa Posição, Data Prod. e Status Prod.; voltar para "Equipamento" mostra Status Prod. = NOK.
2. Salvar projeto com 2 linhas cria 1 Project e 2 Equipment (conferir no painel de dados: romaneio/painel/custo/fluxo = "NOK", peso/volume/veiculo vazios) e abre /projetos.
3. Linha "Material TRT" com posição preenchida antes da troca é gravada com posicao vazia.
4. Em /projetos, "Editar" mostra as pills corretas, as linhas ordenadas por Posição e a barra "Ordenar por".
5. Remover uma linha e salvar exclui o Equipment e as Cargas dele.
6. Alterar um item cujo romaneio = "OK" e salvar mantém romaneio = "OK".
7. "Cancelar" descarta as alterações.

---

## P5a — Dashboard: janelas, busca e tabelas (somente leitura)

```
Implemente a página /dashboard ("Dashboard") usando Project e Equipment (todos os projetos, INCLUSIVE os concluídos).

Definições (hoje = data local AAAA-MM-DD; comparar datas como texto AAAA-MM-DD; dias(a→b) = diferença em dias arredondada):
- ATRASADO: status_embarque = "Não expedido" E data_embarque preenchida E data_embarque < hoje.
- HOJE: status_embarque = "Não expedido" E data_embarque = hoje.
- PRÓXIMOS N DIAS (N = 10 ou 30): status_embarque = "Não expedido" E data_embarque preenchida E 0 ≤ dias(hoje→data_embarque) ≤ N.
- GRUPO MATERIAL: tipo = "Material", "Material TRT" ou "Serviço". GRUPO EQUIPAMENTO: tipo = "Equipamento".

Topo: título "Dashboard", subtítulo "Visão geral dos embarques."
Linha com dois cartões-botão (só um ativo; o ativo tem borda azul #185FA5 e fundo azul 10%):
- "Próximos 10 dias" com um número grande = quantidade de Equipment distintos que são ATRASADO ou PRÓXIMOS 10 DIAS (todos os tipos).
- "Próximos 30 dias" (ATIVO POR PADRÃO) com o número = distintos ATRASADO ou PRÓXIMOS 30 DIAS.
- Os números NÃO mudam com a busca.
À direita: campo de busca com placeholder "Buscar por cliente ou projeto…". Filtra as tabelas mantendo itens cujo Project.client OU Project.name contém o termo, ignorando maiúsculas/minúsculas, acentos e espaços nas pontas.
Legenda: "Legenda:" + quadrado vermelho-claro (#FDE9E7) "Atrasado" + quadrado amarelo-claro (#FEF6D9) "Embarque hoje" + quadrado branco com borda "Dentro do prazo".

Duas seções, conforme o cartão ativo:
- Janela 10: "MATERIAIS — PRÓXIMOS 10 DIAS" (grupo material, ATRASADO ou PRÓXIMOS 10) e "EQUIPAMENTOS — PRÓXIMOS 10 DIAS" (grupo equipamento, idem). Vazio: "Nada nos próximos 10 dias."
- Janela 30: "MATERIAIS — PRÓXIMOS 30 DIAS (INCLUI ATRASADOS)" e "EQUIPAMENTOS — PRÓXIMOS 30 DIAS (INCLUI ATRASADOS)". Vazio: "Nada nos próximos 30 dias."
- Com busca preenchida e nada encontrado: Nenhum item encontrado para "{busca}". Carregando: "Carregando…".
- Títulos de seção pequenos, maiúsculos, cinza.

Tabela de cada seção: texto pequeno (12px), cabeçalho cinza claro FIXO no topo, altura máxima 520px com rolagem; as colunas Projeto (175px), Equipamento (220px) e Tipo ficam CONGELADAS à esquerda na rolagem horizontal (sombra à direita de Tipo). Cor da linha: ATRASADO → fundo #FDE9E7; HOJE → fundo #FEF6D9.
Colunas na ordem (a coluna marcada [M] aparece só na seção Materiais; [E] só na seção Equipamentos; as demais nas duas):
1. (coluna estreita de 28px para a seta de cargas — deixe vazia por enquanto)
2. "Projeto": Project.name em negrito e Project.client em cinza menor abaixo.
3. "Equipamento": equipamento em até 2 linhas, texto completo no tooltip.
4. "Tipo": pill — Equipamento: fundo azul 10% texto #185FA5; Material: fundo âmbar 20% texto marrom escuro; Material TRT: fundo #F3E8FF texto #7E22CE; Serviço: fundo #CCFBF1 texto #0F766E.
5. [E] "Posição": posicao ou "—".
6. "Valor": valor_unitario em moeda.
7. "Qtd": quantidade.
8. [E] "Data Prod.": data_producao.
9. "Data Faturamento": data_faturamento.
10. "Data Embarque": data_embarque + se ATRASADO uma pill vermelha sólida com texto branco "{dias(data_embarque→hoje)}d atraso"; se HOJE uma pill âmbar sólida "hoje".
11. "Frete": frete ou "—".
12. "Romaneio", 13. "Painel", 14. [M] "Custo", 15. "Fluxo": pill "OK" (fundo verde claro, texto verde) ou "NOK" (fundo vermelho claro, texto vermelho) — só exibição por enquanto.
16. "Link": observacao (truncado, tooltip) ou "—".
17. "Obs": nota (truncado, tooltip) ou "—".
18. "Status Embarque": pill — "Expedido" verde; "Não expedido" âmbar; "Cancelado" cinza.

Formatos: moeda = "R$ " + número com 2 casas, vírgula decimal e ESPAÇO como separador de milhar (ex.: R$ 185 000,00). Data = DD/MM/AAAA; vazia = "—".

Ordenação: padrão por "Data Embarque" crescente. Os cabeçalhos Projeto (por Project.name), Equipamento, Tipo, Posição, Valor, Qtd, Data Prod., Data Faturamento, Data Embarque e Status Embarque são clicáveis: clique cicla crescente → decrescente → sem ordenação; Shift+clique adiciona critério secundário (mostrar o número da prioridade ao lado de cada cabeçalho ativo quando houver 2+). Cabeçalho ativo em azul negrito com seta ↑/↓. Valores vazios sempre no final. Posição, Valor e Qtd ordenam como número; datas como data; o resto como texto pt-BR. Tooltip do cabeçalho: "Clique para ordenar · Shift+Clique para ordenação múltipla".
```

**Critérios de aceite**
1. Abre com "Próximos 30 dias" ativo; o número do cartão bate com a quantidade de itens Não expedidos atrasados + com embarque em até 30 dias.
2. Item Não expedido com data de ontem aparece com fundo vermelho claro e pill "1d atraso"; com data de hoje, fundo amarelo e pill "hoje".
3. Item Expedido ou Cancelado nunca aparece.
4. Busca "sao paulo" encontra cliente "São Paulo"; os números dos cartões não mudam.
5. Seção Materiais não tem Posição/Data Prod.; seção Equipamentos não tem Custo; nenhuma tem Status Prod., Peso, Volume ou Veículo.
6. Clique em "Valor" ordena crescente, de novo decrescente, de novo volta à ordem padrão; Shift+clique mostra "1" e "2".
7. Valores aparecem como "R$ 1 234,50".
8. Itens de projetos concluídos aparecem normalmente.

---

## P5b — Dashboard: edições na tabela

```
Na página /dashboard (tabelas das seções Materiais e Equipamentos, entidade Equipment), torne editáveis estas colunas. Todas gravam IMEDIATAMENTE no Equipment, sem botão salvar, atualizando a tela antes da resposta do servidor; se o servidor der erro, volte ao valor anterior e mostre alert com a mensagem do erro.

1. "Romaneio" (campo romaneio), "Painel" (painel), "Custo" (custo — só existe na seção Materiais) e "Fluxo" (fluxo): a pill é um botão; clicar alterna "OK" ↔ "NOK" e grava. "OK" = fundo verde claro/texto verde; "NOK" = fundo vermelho claro/texto vermelho.
2. "Status Embarque" (status_embarque): troque a pill por uma lista com "Não expedido", "Expedido", "Cancelado"; ao escolher, grava. (Se virar Expedido ou Cancelado, o item sai da tabela porque não está mais pendente.)
3. "Link" (observacao): campo de texto de ~128px. Grava ao SAIR do campo e somente se o valor mudou; texto vazio grava nulo. Ao lado, botão com ícone de copiar (tooltip "Copiar observação") que copia o texto atual do campo para a área de transferência; após copiar, o ícone vira um ✓ verde por 2 segundos.
4. "Obs" (nota): campo de texto de ~128px. Grava ao sair do campo e somente se mudou; vazio grava nulo.

Se outro usuário alterar o registro, ao recarregar os campos mostram o valor novo.
```

**Critérios de aceite**
1. Clicar em "NOK" de Romaneio vira "OK" na hora e permanece após recarregar a página.
2. Custo só existe na seção Materiais.
3. Mudar Status Embarque para "Expedido" grava e o item some da tabela.
4. Digitar no Link e clicar fora grava; o botão copiar mostra ✓ por 2 s e o texto está na área de transferência.
5. Digitar em Obs e clicar fora grava (conferir no painel de dados o campo nota).

---

## P5c — Dashboard: cargas dos materiais

```
Na página /dashboard, implemente as Cargas (entidade Carga, ligada ao Equipment por Carga.equipment_id) para itens do grupo material (Equipment.tipo = "Material", "Material TRT" ou "Serviço"). Funciona nas duas seções, mas a seta só aparece em itens do grupo material.

1. Na 1ª coluna (28px, congelada) de cada item do grupo material, mostre uma seta ▸ (tooltip "Cargas"); clicada vira ▾ e abre, logo abaixo do item, uma sub-linha de largura total (fundo cinza bem claro) com o editor de cargas. Clicar de novo recolhe.
2. Editor de cargas: lista as Carga do item (ordem de criação: legacy_created_at se preenchido, senão created_date). Cada carga é uma linha de campos editáveis: "Descrição" (descricao, texto, 160px), "Valor" (valor, número passo 0,01, 112px), "Peso" (peso, número 0,01, 80px), "Volume" (volume, número 0,01, 80px), "Veículo" (veiculo, texto, 112px), seguidos de:
   - botão Salvar (ícone disquete, tooltip "Salvar carga"): grava os 5 campos (peso/volume/veículo vazios = nulo; valor inválido = 0). Em sucesso, o ícone vira ✓ verde por 1,5 s. Em erro: ícone vermelho, tooltip "Falha ao salvar — tente novamente", mantém o que foi digitado e mostra alert com a mensagem (padrão "Erro ao salvar carga"). O botão fica desabilitado enquanto grava.
   - botão Remover (ícone lixeira, tooltip "Remover carga"): confirma com "Tem certeza que deseja excluir esta carga?" e exclui.
3. Sem cargas e sem rascunhos: texto "Nenhuma carga cadastrada."
4. Botão tracejado "Nova carga" (ícone +): MODO RASCUNHO — adiciona uma linha local, NÃO gravada, com Descrição vazia, Valor "0", Peso/Volume/Veículo vazios, e os botões Salvar (tooltip "Salvar carga") e Descartar (lixeira, tooltip "Descartar rascunho"). Pode haver vários rascunhos ao mesmo tempo. Salvar cria a Carga (equipment_id = id do item); em sucesso o rascunho some e a carga aparece na lista; em erro o rascunho continua, com ícone vermelho e alert. Descartar remove o rascunho sem gravar.
5. REGRA DE VALOR: depois de criar, salvar ou excluir uma carga, recalcule e grave Equipment.valor_unitario = soma de Carga.valor de TODAS as cargas restantes daquele item (se não sobrar nenhuma, grava 0). A coluna "Valor" da tabela mostra essa soma quando o item tem cargas (senão mostra valor_unitario).
```

**Critérios de aceite**
1. A seta aparece em itens Material/Material TRT/Serviço e não em Equipamento.
2. "Nova carga" cria um rascunho que não aparece no painel de dados até clicar em Salvar.
3. Duas cargas de R$ 100,00 e R$ 50,00 → coluna Valor mostra R$ 150,00 e Equipment.valor_unitario = 150 no painel de dados.
4. Excluir as duas cargas → valor_unitario = 0.
5. Excluir pede "Tem certeza que deseja excluir esta carga?".
6. Sem cargas aparece "Nenhuma carga cadastrada."

---

## P6a — Faturamento: filtros, totais, pizza e meta

```
Implemente a página /faturamento ("Faturamento") usando Project, Equipment e MetaFaturamento. Considere todos os projetos, INCLUSIVE os concluídos.

Definições:
- ITENS BASE = Equipment com data_embarque preenchida E status_embarque ≠ "Cancelado".
- Subtotal de um item = valor_unitario × quantidade.
- Ano e mês de um item vêm de data_embarque (AAAA-MM-DD).
- FATURADO = status_embarque "Expedido"; FUTURO = "Não expedido".
- Moeda: "R$ " + 2 casas, vírgula decimal, espaço como milhar (R$ 185 000,00).

Topo: título "Faturamento" e o texto: "Faturado = itens Expedido. Futuro = ainda não expedidos (sempre exibidos com 50% de transparência). Itens cancelados ficam de fora." (a palavra Expedido em negrito). Carregando: "Carregando…".

Alerta: se existir QUALQUER Equipment (sem filtros) com status_embarque "Expedido" e valor_unitario vazio ou 0, mostrar faixa âmbar com ícone de alerta: "{n} item(s) com status Expedido estão sem valor unitário — o faturamento pode estar subestimado." (Expedido em negrito).

Cartão de filtros. Use um componente de SELEÇÃO MÚLTIPLA: rótulo pequeno acima; botão mostrando "Todos …" quando tudo está marcado, ou os rótulos marcados separados por vírgula; ao abrir, a 1ª linha é a caixa "Todos …" e depois uma caixa por opção; não é possível desmarcar a última opção marcada; clicar em "Todos …" quando tudo está marcado deixa só a 1ª opção, senão marca tudo; clicar fora fecha.
Filtros:
- "Ano" ("Todos os anos"): opções = anos distintos dos ITENS BASE, ordem decrescente. Padrão: todos.
- "Projeto" ("Todos os projetos"): uma opção por Project, valor = id, RÓTULO = Project.client. Padrão: todos.
- "Mês" ("Todos os meses"): Jan, Fev, Mar, Abr, Mai, Jun, Jul, Ago, Set, Out, Nov, Dez (valores 01…12). Padrão: os meses que têm ITENS BASE.
- "Tipo" ("Todos os tipos"): Equipamento, Material, Material TRT, Serviço. Padrão: todos.
- Caixa de seleção "Mostrar faturamento futuro" (padrão desmarcada).
ITENS FILTRADOS = ITENS BASE cujo ano, project_id, mês e tipo estão nas seleções.

Totais: faturado = soma dos subtotais dos ITENS FILTRADOS Expedido; futuro = idem Não expedido; total = faturado + futuro se a caixa de futuro estiver marcada, senão faturado.
Mostrar o total em número grande azul (#185FA5) com o texto "Total do filtro selecionado" abaixo.

Gráfico de pizza (200×200 px, começando no topo, sentido horário), fatias nesta ordem, cada uma = soma dos subtotais dos ITENS FILTRADOS daquele tipo e situação; omitir fatias com valor 0:
"Equipamento — Faturado" #185FA5; "Material — Faturado" #D97706; "Material TRT — Faturado" #7C3AED; "Serviço — Faturado" #0D9488; e, só com futuro marcado, "Equipamento — Futuro", "Material — Futuro", "Material TRT — Futuro", "Serviço — Futuro" com as mesmas cores a 50% de opacidade.
Legenda ao lado: quadradinho da cor, rótulo, percentual round(valor/total×100)% e o valor em moeda. Sem dados: círculo cinza com "Sem dados" e o texto "Sem dados para este filtro."

Meta anual (abaixo, separada por uma linha):
- Campo numérico com rótulo "META DE FATURAMENTO ({ano})", onde {ano} é o ano quando EXATAMENTE UM ano está selecionado no filtro; caso contrário o rótulo diz "ano" e o campo fica desabilitado. Placeholder "0".
- Valor inicial = MetaFaturamento.valor do registro com ano = ano selecionado (vazio se não houver ou se 0).
- Ao SAIR do campo: grava (upsert) — procura MetaFaturamento com esse ano; se existir atualiza valor, senão cria {ano, valor}. Valor inválido = 0. Erro → alert. A meta é única por ano e compartilhada entre todos.
- faturadoDoAno = soma dos subtotais de TODOS os ITENS BASE Expedido com ano = ano selecionado (IGNORA os filtros de Projeto, Mês e Tipo e a caixa de futuro).
- pct = min(100, faturadoDoAno/meta×100) (0 se meta = 0); falta = max(0, meta − faturadoDoAno); atingida = meta > 0 e faturadoDoAno ≥ meta.
- Barra de progresso arredondada (20px de altura, fundo cinza) com largura pct%: VERDE enquanto não atingida, AZUL #185FA5 quando atingida.
- Texto abaixo da barra: sem ano único → "Selecione um ano específico para definir a meta."; meta 0 → "Defina uma meta para acompanhar o progresso."; atingida → (em azul) "Meta atingida — {faturadoDoAno} de {meta}"; senão → "Faturado {faturadoDoAno} de {meta} — {round(pct)}% da meta · faltam {falta}" (valores em negrito, em moeda).
```

**Critérios de aceite**
1. Itens cancelados e itens sem data de embarque não entram em nenhum número.
2. Com a caixa de futuro desmarcada, o total = soma de (valor × qtd) dos Expedidos filtrados; marcando, soma também os Não expedidos e aparecem as fatias "— Futuro" mais claras.
3. Selecionar só 1 ano habilita a meta; digitar 1000000 e sair do campo cria/atualiza MetaFaturamento daquele ano (sem duplicar).
4. A barra é verde abaixo da meta e azul quando atingida, com os textos corretos.
5. Mudar o filtro de Projeto não altera o "Faturado … de …" da meta.
6. O filtro Projeto mostra o nome do cliente; o filtro Tipo tem as 4 opções; não dá para desmarcar a última opção.

---

## P6b — Faturamento: gráfico mensal, detalhamento e exportação XLSX

```
Na página /faturamento (já com filtros Ano, Projeto, Mês, Tipo e a caixa "Mostrar faturamento futuro"; ITENS FILTRADOS = Equipment com data_embarque preenchida, status_embarque ≠ "Cancelado" e que passam nos filtros; subtotal = valor_unitario × quantidade; moeda "R$ 185 000,00"; datas DD/MM/AAAA, vazio "—"), adicione abaixo do cartão de filtros:

1) Cartão "Faturamento mês a mês", subtítulo "Faturado (sólido) e futuro (50% transparência) ao longo do ano selecionado."
- Se não houver EXATAMENTE UM ano selecionado: "Selecione um ano específico para visualizar o gráfico mensal."
- Senão: 12 colunas Jan…Dez. Para cada item filtrado daquele ano: se Expedido soma o subtotal em "fat" do mês; se não, soma em "fut" do mês SOMENTE com a caixa de futuro marcada.
- Barra empilhada por mês (largura até 40px): fat em #185FA5 sólido embaixo, fut em #185FA5 com 50% de opacidade em cima; altura = valor / max(1, maior total mensal) × 180 px. Acima da barra, o total do mês em moeda (só se > 0, texto pequeno cinza). Abaixo, o nome do mês.

2) Cartão "Detalhamento" com botão "Exportar XLSX" (ícone de download) à direita do título e subtítulo "Itens que compõem os valores acima, conforme os filtros selecionados."
- Caixas de resumo: "FATURADO (EXPEDIDO)" (valor em verde) = soma dos Expedidos filtrados; "FATURAMENTO FUTURO" (valor em âmbar) = soma dos Não expedidos filtrados, SÓ quando a caixa de futuro estiver marcada; "TOTAL DO FILTRO" (valor em azul) = faturado (+ futuro se marcado).
- LINHAS = itens filtrados Expedido; com a caixa de futuro marcada, também os Não expedido. Ordem de criação (legacy_created_at, senão created_date).
- Colunas: "Projeto" (Project.name em negrito + Project.client em cinza), "Equipamento" (equipamento, até 2 linhas), "Tipo" (pill: Equipamento azul claro; Material âmbar; Material TRT roxo #F3E8FF/#7E22CE; Serviço #CCFBF1/#0F766E), "POS" (posicao ou "—"), "Qtd", "Valor Un" (moeda), "Subtotal" (moeda, negrito), "Data Embarque", "Data Fat." (data_faturamento), "Status" (pill: Expedido verde, Não expedido âmbar), "Situação" (pill "Faturado" verde se Expedido, senão "Futuro" âmbar).
- Linhas não expedidas com 50% de opacidade.
- Linha final "Total" (negrito, fundo cinza) com o total na coluna Subtotal.
- Sem linhas: "Nenhum item para os filtros selecionados."

3) Exportar XLSX (gerar o arquivo no navegador, por exemplo com a biblioteca SheetJS/xlsx) com as MESMAS LINHAS do Detalhamento, em duas abas:
- Aba "Equipamentos" (linhas com tipo = "Equipamento"), colunas nesta ordem: Projeto, Cliente, Equipamento, Tipo, Posição (número se posicao for numérica, senão texto), Qtd, Valor Unitário, Subtotal, Data Faturamento, Data Embarque, Status (status_embarque), Situação ("Faturado" se Expedido, senão "Futuro").
- Aba "Materiais" (tipo = "Material", "Material TRT" ou "Serviço"), colunas: Projeto, Cliente, Descrição (= equipamento), Tipo, Qtd, Valor Unitário, Subtotal, Data Faturamento, Data Embarque, Frete, Peso (kg) (= peso), Volume (m³) (= volume), Observação (= observacao), Status, Situação.
- As colunas de data são datas reais do Excel no formato dd/mm/yyyy (vazias ficam em branco); valores numéricos como número; largura de coluna automática (máximo 50 caracteres).
- Nome do arquivo: faturamento_{anos}_{meses}.xlsx, onde {anos} = "todos" se todos os anos disponíveis estiverem selecionados, senão os anos selecionados em ordem crescente unidos por "-"; {meses} = "todos" se os 12 meses estiverem selecionados, senão os números de 2 dígitos em ordem unidos por "-". Ex.: faturamento_2026_todos.xlsx, faturamento_todos_03-04.xlsx.
```

**Critérios de aceite**
1. Com 2 anos selecionados aparece "Selecione um ano específico para visualizar o gráfico mensal."; com 1 ano aparecem 12 barras.
2. Marcar futuro adiciona a parte clara nas barras, a caixa "FATURAMENTO FUTURO" e as linhas com 50% de opacidade.
3. A linha "Total" bate com "TOTAL DO FILTRO".
4. O XLSX baixado tem as abas "Equipamentos" e "Materiais" com exatamente as colunas listadas e datas como data.
5. Nome do arquivo segue o padrão (ex.: só 2026 e todos os meses → faturamento_2026_todos.xlsx).

---

## P7 — Admin

```
Implemente a página /admin ("Administração de usuários"), acessível SOMENTE para User.role = "admin" (outros são redirecionados para /dashboard). Use a entidade nativa User (campos email, role, approval_status, created_date).

Topo: título "Administração de usuários"; subtítulo "Aprove novos cadastros e gerencie permissões. Todos os usuários aprovados compartilham a mesma base de dados." Carregando: "Carregando…".

Seção 1 — título pequeno maiúsculo cinza "AGUARDANDO APROVAÇÃO ({n})": usuários com approval_status = "pending". Vazio: caixa tracejada "Nenhum cadastro pendente."
Seção 2 — "USUÁRIOS ({n})": usuários com approval_status "approved" ou "rejected". Vazio: "Nenhum usuário."
Ordem nas duas: cadastro mais recente primeiro (created_date decrescente).

Tabela (as duas seções): colunas "E-mail" (negrito), "Status" (pill: pending → "Pendente" âmbar; approved → "Aprovado" verde; rejected → "Rejeitado" vermelho), "Papel" (role admin → pill azul claro com ícone de escudo "Admin"; senão pill cinza "Usuário"), "Cadastro" (created_date em DD/MM/AAAA, cinza), "Ações" (alinhadas à direita):
- "Aprovar" (borda/texto verde, ícone ✓): aparece para pending e rejected → approval_status = "approved".
- "Rejeitar" (borda/texto vermelho, ícone X): aparece para quem não está rejected → approval_status = "rejected".
- "Tornar admin" / "Remover admin" (botão neutro): só para approved → role = "admin" / role = "user".
Após cada ação, recarregar a lista. Erro → alert com a mensagem.
```

**Critérios de aceite**
1. Usuário recém-cadastrado aparece em "Aguardando aprovação" com "Pendente", botões Aprovar e Rejeitar.
2. Aprovar move para "Usuários" com "Aprovado" e botões Rejeitar e Tornar admin; o usuário passa a entrar no app.
3. Rejeitar mostra "Rejeitado" com o botão Aprovar; o usuário fica bloqueado.
4. "Tornar admin" mostra a pill Admin e o usuário passa a ver a aba Admin; "Remover admin" desfaz.
5. Usuário comum não acessa /admin.

---

## P8 — Verificação final

```
Revise o app inteiro contra a lista abaixo e corrija o que estiver diferente, sem alterar o que já está correto. Responda com a lista marcando cada item como OK ou CORRIGIDO.

1. Entidades Project, Equipment, Carga, MetaFaturamento com os nomes de campos e valores de enum exatos ("Não expedido", "Expedido", "Cancelado"; "Equipamento", "Material", "Material TRT", "Serviço"; "OK"/"NOK"; "CIF"/"FOB").
2. Só usuários com approval_status = "approved" leem/gravam dados; usuário comum não altera o próprio approval_status/role; dados compartilhados entre todos os aprovados.
3. Telas de bloqueio "pending" e "rejected" com os textos exatos e botão Sair.
4. Menu: Dashboard, Faturamento, Projetos, Novo projeto (+ Admin só para admin); /admin bloqueado para não-admin.
5. Moeda "R$ 185 000,00" (espaço no milhar) e datas DD/MM/AAAA ("—" se vazio) em todas as telas.
6. Atrasado = Não expedido com data_embarque < hoje; Hoje = Não expedido com data = hoje; Próximos N = Não expedido com 0 ≤ dias ≤ N.
7. Projetos: filtro Em aberto (padrão)/Fechados/Todos por concluido; Concluir/Reabrir; Excluir com confirmação e cascata (Carga → Equipment → Project); edição com pills, ordenar por Posição/Data Embarque, salvar preservando romaneio/painel/custo/fluxo e excluindo cargas de itens removidos.
8. Formulário de itens: 13 colunas na ordem; Posição/Data Prod./Status Prod. desabilitados fora de "Equipamento"; troca de tipo limpa/restaura; Material TRT grava posição/produção vazias; peso/volume/veiculo sempre vazios.
9. Novo projeto: nome e cliente obrigatórios, começa com 1 linha, salvar leva a /projetos.
10. Dashboard: cartões 10/30 dias (30 padrão; contagem de atrasados + janela, não muda com busca); busca sem acento; legenda; seções Materiais e Equipamentos; colunas por seção (Materiais sem Posição/Data Prod.; Equipamentos sem Custo; nenhuma com Status Prod./Peso/Volume/Veículo); cores de linha; badges "Nd atraso"/"hoje"; ordenação padrão por Data Embarque com clique/Shift+clique; colunas congeladas; cabeçalho fixo 520px.
11. Dashboard: toggles Romaneio/Painel/Custo/Fluxo, Status Embarque em lista, Link (copiar com ✓ 2 s) e Obs gravam na hora, com reversão e alert em erro.
12. Dashboard: cargas só para Material/Material TRT/Serviço; modo rascunho "Nova carga"; salvar com ✓ 1,5 s; excluir com confirmação; valor_unitario = soma das cargas após cada mudança (0 sem cargas).
13. Projetos concluídos continuam no Dashboard e no Faturamento.
14. Faturamento: exclui Cancelados e sem data; alerta de Expedidos sem valor; filtros Ano/Projeto (rótulo = cliente)/Mês/Tipo (4 opções) com seleção múltipla mínima de 1; caixa futuro; total; pizza 4/8 fatias com cores; meta anual upsert por ano com barra verde/azul e textos; faturado do ano ignora filtros de projeto/mês/tipo; gráfico mensal só com 1 ano; Detalhamento com 11 colunas, opacidade 50% no futuro e linha Total; XLSX com abas Equipamentos/Materiais, colunas exatas, datas dd/mm/yyyy e nome faturamento_{anos}_{meses}.xlsx.
15. Admin: seções Aguardando aprovação e Usuários, colunas, pills e botões Aprovar/Rejeitar/Tornar admin/Remover admin conforme o status.
```

**Critérios de aceite**
1. O Base44 respondeu com os 15 itens marcados.
2. Você conferiu manualmente a checklist completa do arquivo 02-funcionalidades.md (seção 10, itens 1–128) e todos passaram.


---

<!-- ===== Arquivo: 04-migracao-dados.md ===== -->

# 04 — Migração dos dados atuais para o Base44

A migração tem duas partes:

- **Parte A — dono do app** (tem acesso ao Supabase): roda as queries SQL abaixo e gera 5 arquivos CSV.
- **Parte B — colega** (monta o Base44): importa os CSV na ordem certa e religa as referências.

Pré-requisito: as entidades do prompt **P0** já criadas no Base44 (com os campos `legacy_*`).

---

## Parte A — Exportar do Supabase (dono do app)

Como executar cada query:
- **Opção 1 (mais simples):** Supabase → *SQL Editor* → colar a query → *Run* → no resultado, botão **Download CSV** (ou "Export → CSV"). Salvar com o nome indicado.
- **Opção 2 (psql):** `\copy ( <query sem o ponto e vírgula final> ) TO 'nome.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')`.

Os nomes das colunas de cada query **já são os nomes dos campos** das entidades no Base44. Valores vazios (NULL) saem como célula vazia. O UUID original vai em `legacy_id`.

> Nas tabelas `Equipment` e `Carga`, a coluna de referência (`project_id` / `equipment_id`) sai **temporariamente com o UUID antigo** (o campo é obrigatório no Base44). Depois da importação, a Parte B troca esse valor pelo id novo do Base44.

### A1. `projects.csv` → entidade Project

```sql
SELECT
  p.id::text                                                            AS legacy_id,
  p.name                                                                AS name,
  p.client                                                              AS client,
  COALESCE(p.concluido, false)                                          AS concluido,
  to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS legacy_created_at
FROM public.projects p
ORDER BY p.created_at, p.id;
```

### A2. `equipments.csv` → entidade Equipment

```sql
SELECT
  e.id::text                                  AS legacy_id,
  e.project_id::text                          AS project_id,          -- temporário (UUID antigo)
  e.project_id::text                          AS legacy_project_id,
  e.equipamento                               AS equipamento,
  COALESCE(e.tipo, 'Equipamento')             AS tipo,
  e.posicao                                   AS posicao,
  e.valor_unitario                            AS valor_unitario,
  e.quantidade                                AS quantidade,
  to_char(e.data_producao,    'YYYY-MM-DD')   AS data_producao,
  e.status_producao                           AS status_producao,
  to_char(e.data_embarque,    'YYYY-MM-DD')   AS data_embarque,
  e.status_embarque                           AS status_embarque,
  to_char(e.data_faturamento, 'YYYY-MM-DD')   AS data_faturamento,
  e.frete                                     AS frete,
  e.peso                                      AS peso,
  e.volume                                    AS volume,
  e.veiculo                                   AS veiculo,
  e.observacao                                AS observacao,
  e.nota                                      AS nota,
  e.romaneio                                  AS romaneio,
  e.painel                                    AS painel,
  e.custo                                     AS custo,
  e.fluxo                                     AS fluxo,
  to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS legacy_created_at
FROM public.equipments e
ORDER BY e.created_at, e.id;
```

### A3. `cargas.csv` → entidade Carga

```sql
SELECT
  c.id::text                                  AS legacy_id,
  c.equipment_id::text                        AS equipment_id,        -- temporário (UUID antigo)
  c.equipment_id::text                        AS legacy_equipment_id,
  c.descricao                                 AS descricao,
  c.valor                                     AS valor,
  c.peso                                      AS peso,
  c.volume                                    AS volume,
  c.veiculo                                   AS veiculo,
  to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS legacy_created_at
FROM public.cargas c
ORDER BY c.created_at, c.id;
```

### A4. `metas_faturamento.csv` → entidade MetaFaturamento

```sql
SELECT
  m.id::text  AS legacy_id,
  m.ano       AS ano,
  m.valor     AS valor
FROM public.metas_faturamento m
ORDER BY m.ano;
```

### A5. `usuarios.csv` → NÃO é importado (lista de referência para recriar acessos)

```sql
SELECT
  p.id::text      AS legacy_id,
  p.email         AS email,
  p.status::text  AS approval_status,
  CASE WHEN EXISTS (
         SELECT 1 FROM public.user_roles r
         WHERE r.user_id = p.id AND r.role = 'admin'
       ) THEN 'admin' ELSE 'user' END AS role,
  to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cadastro
FROM public.profiles p
ORDER BY p.created_at;
```

### A6. Números de conferência (anotar e enviar junto com os CSV)

```sql
SELECT
  (SELECT count(*) FROM public.projects)                         AS qtd_projects,
  (SELECT count(*) FROM public.projects WHERE concluido)         AS qtd_projects_concluidos,
  (SELECT count(*) FROM public.equipments)                       AS qtd_equipments,
  (SELECT count(*) FROM public.cargas)                           AS qtd_cargas,
  (SELECT count(*) FROM public.metas_faturamento)                AS qtd_metas,
  (SELECT COALESCE(sum(valor_unitario * quantidade), 0)
     FROM public.equipments WHERE status_embarque = 'Expedido')  AS total_expedido,
  (SELECT COALESCE(sum(valor), 0) FROM public.cargas)            AS total_cargas;
```

Envie ao colega: `projects.csv`, `equipments.csv`, `cargas.csv`, `metas_faturamento.csv`, `usuarios.csv` e os números da A6.

---

## Parte B — Importar no Base44 (colega)

### B1. Ordem de importação

Importe **nesta ordem** (pais antes dos filhos):

1. `projects.csv` → **Project**
2. `equipments.csv` → **Equipment**
3. `cargas.csv` → **Carga**
4. `metas_faturamento.csv` → **MetaFaturamento** (independente; pode ser em qualquer momento)

Como importar: no Base44, abra o painel de dados (*Data*), escolha a entidade e use **Import** / "Importar CSV". Se a sua versão do Base44 não tiver esse botão, anexe o CSV no chat do Base44 e escreva: "Importe todas as linhas deste CSV na entidade {Nome}, mapeando cada coluna para o campo de mesmo nome. Não altere valores; células vazias ficam vazias."

Cuidados:
- Confira que as colunas foram mapeadas para os campos **de mesmo nome** (inclusive `legacy_id`, `legacy_project_id`, `legacy_equipment_id`, `legacy_created_at`).
- Não edite os CSV no Excel antes de importar (o Excel pode trocar datas e o separador decimal). Se precisar abrir, use um editor de texto.
- Não use o app (Dashboard/Projetos) entre o passo 2 e a religação (B2): até lá os itens apontam para ids antigos.

### B2. Religar as referências (obrigatório)

Depois do passo 3, `Equipment.project_id` e `Carga.equipment_id` ainda contêm os UUIDs antigos. Cole este prompt no Base44:

```
Crie uma página administrativa /migracao, visível só para User.role = "admin" (não coloque no menu), com o título "Migração — religar referências" e um botão "Religar referências". Ao clicar:
1. Carregue TODOS os registros de Project, Equipment e Carga (com paginação, sem limite de quantidade).
2. Monte o mapa Project.legacy_id → Project.id. Para cada Equipment com legacy_project_id preenchido: se existir Project com legacy_id = legacy_project_id, grave Equipment.project_id = id desse Project (só se for diferente do atual). Se não existir, conte como "órfão".
3. Monte o mapa Equipment.legacy_id → Equipment.id. Para cada Carga com legacy_equipment_id preenchido: se existir Equipment com legacy_id = legacy_equipment_id, grave Carga.equipment_id = id desse Equipment (só se diferente). Senão conte como órfã.
4. Grave em lotes pequenos para não estourar limites, mostrando o progresso.
5. Ao final mostre: quantidade de Project, Equipment e Carga; quantos Equipment e Cargas foram religados; quantos ficaram órfãos (listar legacy_id dos órfãos). Não altere nenhum outro campo (principalmente valor_unitario).
O botão pode ser clicado mais de uma vez sem causar problema (idempotente).
```

**Critérios de aceite da religação**
1. Órfãos = 0.
2. Abrindo um projeto em /projetos → "Editar", aparecem os mesmos itens do app antigo.
3. Em /dashboard, a seta de um material mostra as mesmas cargas do app antigo.

### B3. Conferência

Compare com os números da A6 enviados pelo dono do app:

| Conferência | Onde ver no Base44 |
|---|---|
| `qtd_projects`, `qtd_equipments`, `qtd_cargas`, `qtd_metas` | contagem de registros de cada entidade no painel de dados (ou o resumo da página /migracao) |
| `qtd_projects_concluidos` | /projetos com filtro "Fechados" |
| `total_expedido` | /faturamento com todos os anos, todos os projetos, todos os meses, todos os tipos e "Mostrar faturamento futuro" desmarcado → "TOTAL DO FILTRO" (deve ser igual, exceto itens Expedido sem data de embarque, que o Faturamento não considera) |
| `total_cargas` | soma de Carga.valor no painel de dados |

Se tudo bater, a página /migracao pode ser apagada (peça ao Base44: "remova a página /migracao").

---

## O que NÃO migra e como recriar os acessos

| Não migra | Por quê | O que fazer |
|---|---|---|
| Senhas e contas de login | O Base44 tem autenticação própria; senhas do Supabase são criptografadas e não podem ser exportadas | Cada pessoa cria a conta de novo no Base44 |
| `user_id` / dono dos registros | Os dados são compartilhados entre todos os aprovados; o Base44 preenche `created_by` com quem importou | Nada a fazer |
| `created_at` / `updated_at` como datas nativas | O Base44 define `created_date` na importação | A ordem original fica preservada em `legacy_created_at` |
| Projeto de exemplo automático (seed) | Não deve ser reproduzido | Nada a fazer |

Recriar os acessos (usando `usuarios.csv`):

1. O dono do app no Base44 já é `role = admin`; garanta que ele tenha `approval_status = approved` (painel de dados → User).
2. Para cada linha de `usuarios.csv` com `approval_status = approved`: convide a pessoa pelo e-mail (Base44 → *Users* → *Invite*) ou peça que ela se cadastre no app. Ela nascerá `pending`.
3. Na página **/admin**, clique em **Aprovar** para cada uma. Se no CSV ela tem `role = admin`, clique também em **Tornar admin**.
4. Linhas com `pending` ou `rejected` no CSV: não precisam ser recriadas (se a pessoa se cadastrar, ela aparecerá como pendente e o admin decide).
5. Opcional: preencher `User.legacy_id` com o `legacy_id` do CSV, só para histórico.
