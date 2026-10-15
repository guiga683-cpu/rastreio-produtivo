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
