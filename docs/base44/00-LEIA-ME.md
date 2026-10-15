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
