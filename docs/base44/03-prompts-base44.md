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
