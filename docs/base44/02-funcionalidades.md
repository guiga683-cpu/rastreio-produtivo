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
