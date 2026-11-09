# SGM — Sistema de Gestão para Marmitaria

Estágio curricular — FIPP. Deploy alvo: **14/11**.

## Arquitetura

Mesmo padrão em camadas do projeto Sistema-Gestao-Consorcios, adaptado:

```
Route → Controller → Service → Repository → Entity → Database (mysql2, SQL puro)
```

- **Entity**: representa a linha da tabela, valida os próprios dados (`validar()`), converte de/para JSON.
- **Repository**: só SQL. Estende `Repository` base (acesso ao pool via `Database`).
- **Service**: regra de negócio (hash de senha, validações cruzadas, regras do caixa aberto/fechado, etc). Fica entre Controller e Repository.
- **Controller**: só HTTP (parse do request, status code, chamada ao Service).
- **Auth**: JWT em cookie httpOnly (`authMiddleware.js`), com `perfil` (ADMIN/ATENDENTE/COZINHA) pra controle de acesso por rota via `auth.permitir('ADMIN')`.

Front: **Vite + React** (SPA), não Next.js — decisão pra manter o deploy leve, já que o sistema não precisa de SSR.

### Camada visual (UI)

Bootstrap 5 + SCSS + ícones Tabler + ApexCharts, portados de um mockup de admin (originalmente em Next.js) pro Vite. Cor primária ajustada pro laranja do wireframe do Figma (`#D85A30`).

- `src/styles/globals.scss` — tema (cores, sidebar, topbar, cards). É só editar as variáveis `$primary`, `$success` etc no topo pra reajustar a paleta.
- `src/lib/menu.js` — fonte única do menu lateral **e** das rotas. Cada função (RF) vira automaticamente uma rota em `App.jsx` (via `PlaceholderPage`) só de existir nesse arquivo — não precisa mexer no `App.jsx` pra adicionar uma tela nova, só trocar o `PlaceholderPage` pela tela de verdade quando for implementar.
- `src/components/AppShell.jsx` — casca (Sidebar + Topbar + conteúdo), usada em toda página logada.
- `src/components/Topbar.jsx` — já plugado no `AuthContext`: mostra nome/perfil reais e o botão Sair funciona de verdade.

## Rodando localmente

### Backend
```bash
cd server
cp .env.example .env   # ajuste DB_USER/DB_PASSWORD/JWT_SECRET
npm install
npm run dev             # http://localhost:5000
```

Cada conexão MySQL usa o deslocamento fixo `time_zone = '-03:00'`, inclusive em transações, mantendo `dateStrings: true`; os registros antigos não são convertidos.

### Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev             # http://localhost:5173
```

### Documentação da API (Swagger)

A documentação das rotas existentes fica em **http://localhost:5000/api-docs/** e usa
o arquivo único `server/docs/openapi.yaml` (OpenAPI 3.0). Os endpoints aparecem por tag,
com corpos de requisição, respostas e perfis permitidos.

Para ativar, configure **somente no seu `server/.env` local**:

```dotenv
SWAGGER_ATIVO=true
```

Reinicie o backend com `npm run dev` dentro de `server/`. A variável deve ser exatamente
`true`; se estiver ausente, vazia, `false` ou com outro valor, `/api-docs` e seus arquivos
retornam **404**. O `.env.example` mantém a documentação desativada por padrão.

Para testar uma rota autenticada pelo navegador:

1. Abra `/api-docs/` no mesmo servidor da API (a documentação usa o endereço relativo `/api`).
2. Em **Login → POST /login**, clique em **Try it out**, preencha `email` e `senha` de uma
   conta existente e clique em **Execute**. Senhas e tokens não têm valores de exemplo;
   os valores genéricos gerados pela interface devem ser substituídos somente ao executar.
3. Execute **GET /login/usuario** para confirmar a sessão. O navegador envia automaticamente
   o cookie `token`, que é httpOnly. O botão **Authorize** não serve para definir esse cookie;
   o login é feito pela própria operação **POST /login**.
4. Use as demais operações conforme o perfil da conta. A documentação mantém as permissões
   existentes; por exemplo, cadastros de usuários exigem ADMIN e cardápios permitem ADMIN/ATENDENTE.
5. Execute **POST /login/logout** para encerrar a sessão.

Em produção, acesse por **HTTPS**, porque o cookie de login tem `Secure`. Os testes usam
o banco configurado para o servidor e as operações de escrita alteram os cadastros reais.
O Swagger usa `withCredentials: true`, sem persistir autorização e sem enviar o documento
ao validador externo. Para mudar contratos documentados, edite apenas `server/docs/openapi.yaml`.

## Checklist de implementação (por Sprint)

- [x] Documentação das rotas da API com Swagger/OpenAPI, habilitada somente com `SWAGGER_ATIVO=true`.

### Sprint 2 (24/08–12/09) — RF_B1–B3
- [x] RF_B1 — Usuários (feito: entity, repository, service, controller, route, login/JWT)
- [x] RF_B2 — Produtos (copiar o padrão de `usuario*`)
- [x] RF_B3 — Insumos (copiar o padrão de `usuario*`)

### Sprint 3 (14–26/09) — RF_B4 + RF_F1 + abertura RF_F9
- [x] RF_B4 — Clientes
- [x] RF_F1 — Cardápio do Dia (itens fixos em texto livre, opções de mistura ordenadas, adicionais e reutilização entre datas)
- [x] Cadastro de adicionais (nome, preço, vínculo opcional com insumo, edição, inativação/reativação e exclusão)
- [x] RF_F9 — Caixa: abertura (troco inicial, responsável autenticado, caixa único aberto e últimas dez aberturas)

### Sprint 4 (28/09–17/10) — RF_F2–F4
- [x] RF_F2 — Backend e frontend concluídos: lançamento com itens, mistura, adicionais e pagamento; tela Pedidos com lista recente, detalhes e troco
- [x] RF_F3 — Status do Pedido, cancelamento com motivo e comanda da cozinha
- [x] RF_F4 — Movimentação de Estoque (entradas, perdas e ajustes manuais, saldo não negativo, transação com bloqueio por insumo, saldos e histórico)

### Sprint 5 (19/10–14/11) — restante + deploy
- [x] RF_F5 — Consulta de pagamentos por data, forma, status e caixa; pagamento criado no lançamento do pedido
- [x] RF_F6 — Fiado por cliente e quitação individual ou em lote, vinculada ao caixa do recebimento
- [x] RF_F7 — Entradas e saídas manuais, recebimentos consolidados por caixa fechado, filtros e totais, recorrência informativa e compra de estoque com despesa atômica
- [x] RF_F9 — Caixa: Abrir/Fechar, histórico, resumo por forma de pagamento e conferência do dinheiro físico com falta/sobra
- [x] RF_S1 — Vendas e pedidos por data do pedido, com ticket médio e fiado a receber
- [x] RF_S2 — Saldos atuais e resumo das movimentações de estoque
- [x] RF_S3 — Relatório financeiro por categoria e forma de pagamento, com recebimentos de caixas fechados
- [x] RF_S4 — Ranking de produtos e adicionais por quantidade ou valor
- [x] RF_S5 — Fiado por cliente, com pendências atuais e quitações do período
- [ ] Deploy

### Ajustes de interface

- [x] Confirmações em diálogo próprio com suporte a teclado, foco controlado e notificações no padrão visual do sistema
- [x] Formulário de adicionais em card acima da lista, no padrão dos demais cadastros

## Relatórios (RF_S1–RF_S5)

Abra `/relatorios` com o perfil ADMIN ou ATENDENTE. As abas compartilham o período, que começa no dia
atual da operação (UTC−3). O botão **Imprimir** abre a impressão do navegador em A4 com o relatório
da aba ativa, o período consultado e as tabelas. A navegação e os controles ficam fora da folha.

- **Vendas e pedidos** usa `pedido.data_hora` e apresenta quantidades e valores por dia, forma original
  de pagamento, tipo de atendimento e status. Cancelados têm contagem e valor separados. O ticket médio
  divide o total vendido pelos pedidos válidos. O fiado pendente integra o vendido e aparece como valor
  a receber. O Financeiro usa a data de fechamento do caixa para consolidar recebimentos.
- **Estoque** mostra o saldo atual, o mínimo e o destaque quando o saldo fica abaixo dele. O filtro de
  período afeta as quantidades de compra, perda e ajustes de entrada e saída por insumo.
- **Financeiro** é exclusivo de ADMIN e usa os mesmos lançamentos da tela Financeiro. Consolida as
  vendas pagas e as quitações pela data de fechamento do caixa que recebeu o dinheiro. Mostra entradas,
  saídas e saldo do período, lançamentos por categoria e recebimentos pela forma efetiva de pagamento.
  O fiado a receber é o saldo atual das pendências e aparece à parte do saldo financeiro.
- **Produtos mais vendidos** permite ordenar por quantidade ou valor vendido. Produtos e adicionais são
  agregados separadamente pelos subtotais históricos de pedidos válidos.
- **Fiado por cliente** lista as pendências atuais e os pedidos quitados no período, com totais por
  cliente, contagem de pedidos pendentes e data do fiado pendente mais antigo. O período usa a data
  da quitação e inclui clientes que quitaram no período mesmo com saldo em aberto zerado.

No Swagger, faça login como ADMIN ou ATENDENTE e abra as rotas GET `/relatorio/vendas`, `/relatorio/estoque`,
`/relatorio/produtos-mais-vendidos` e `/relatorio/fiado`. Com ADMIN, consulte também `/relatorio/financeiro`.
Use `dataInicio` e `dataFim` no formato `AAAA-MM-DD` com as duas bordas inclusivas. Um único parâmetro
seleciona aquele dia. COZINHA recebe 403 em todos os relatórios e ATENDENTE recebe 403 no financeiro.
Pedidos legados sem pagamento ficam em **Sem pagamento registrado**. Se houver mais de um pagamento legado
para o mesmo pedido, a classificação usa o primeiro, como no detalhe do pedido.

As consultas usam o esquema atual e dispensam migrations no banco local e no Railway.
Execute `node --test server/tests/relatorio.test.js` com Node.js 22.13+ para rodar as consultas em SQLite
em memória com dados de teste. A mesma suíte pode usar MySQL 8 com `SGM_RELATORIO_MYSQL_TEST_PORT` apontando
para uma instância local descartável com usuário `root` de teste sem senha. Nesse modo a suíte cria e remove
um esquema exclusivo de fixtures.

## Resumo financeiro e conferência do caixa

`GET /caixa/:id/resumo` está disponível para ADMIN e ATENDENTE e calcula valores de caixas
abertos ou fechados. Usa `pedido.id_caixa` e `pagamento.id_pedido`, sem filtrar pelo dia:
um caixa aberto ontem inclui todas as suas vendas de hoje até o fechamento.

- **Recebido:** pagamentos diretos PAGO em Dinheiro, Pix, Débito e Crédito + fiados recebidos neste caixa,
  com total e quantidade por forma. A seção `fiadoRecebido` usa a forma e o caixa da quitação.
- **Fiado pendente:** somente FIADO PENDENTE; aparece separado e não representa recebimento.
- **Total vendido:** vendas pagas diretamente + fiado pendente + fiado quitado originados neste caixa.
  A venda permanece no caixa de origem, mesmo após quitar em outro caixa. Quitação não é nova venda.
- **Saldo esperado na gaveta:** abertura + vendas e quitações recebidas em dinheiro. Usa `pagamento.valor`,
  não o valor recebido do cliente; o troco já está descontado. `valor_recebido` null equivale ao valor exato.
- **Conferência:** valor contado menos saldo esperado. Zero é Conferido, positivo é Sobra e negativo é Falta.
  Uma diferença não impede fechar; a tela solicita confirmação e permite prosseguir.

Na tela Caixa, Atualizar recarrega o resumo; Ver resumo no histórico consulta qualquer caixa sem editá-lo.
Antes da confirmação e antes de enviar o fechamento, a tela reconsulta os valores. Se as vendas em dinheiro
mudarem durante a confirmação, pede nova conferência. O fechamento aceita `idCaixa` opcional para
proteger a identidade do caixa conferido; clientes antigos podem continuar enviando somente `valorFechamento`.
O update condicional e a leitura do caixa fechado usam uma única `ExecutaTransacao`. O bloqueio exclusivo
aguarda o FOR SHARE dos pedidos e quitações já em andamento; recebimentos posteriores não entram no caixa fechado.
O resumo final é consultado depois do fechamento e inclui essas últimas vendas; a confirmação da tela
não reserva o caixa nem mantém uma transação aberta enquanto o usuário decide.

**Limitações:** não inclui sangrias, suprimentos, despesas, taxas, estornos, quitação parcial, descontos
ou divisão da quitação em várias formas. A quitação individual ou de todos os pendentes do cliente usa uma única forma.
Pedidos CANCELADO e pagamentos CANCELADO não contam. O cancelamento de pedido exige caixa aberto e
cancela todos os seus pagamentos; não registra estorno bancário nem retirada/devolução física de dinheiro.
Alterar status diretamente no banco também muda o resumo calculado.
FIADO PAGO sem metadados de quitação (registro legado/manual) não é inferido como dinheiro, Pix ou cartão.
Cada registro de pagamento válido é somado uma vez, sem join com itens; o fluxo atual
cria um pagamento por pedido, mas duplicações manuais no banco não são conciliadas automaticamente.
Não existe saldo acumulado nem snapshot financeiro gravado. A migration 007 adiciona somente os dados da quitação.

Testes: `node --test server/tests/pedido.test.js server/tests/caixa.test.js`. O banco simulado cobre cálculos,
status, permissões, fechamento, rollback e as duas ordens de concorrência S/X; não substitui testes de
SQL, isolamento e bloqueios em MySQL 8 real.

## Consulta de pagamentos e quitação de fiado (RF_F5/RF_F6)

Aplique uma única vez [`server/db/migrations/007-pagamento-quitacao.sql`](server/db/migrations/007-pagamento-quitacao.sql)
no banco local **e no Railway**, depois das migrations anteriores. O schema não tinha nenhum dos quatro campos:
`id_usuario_quitacao`, `data_quitacao`, `forma_quitacao` e `id_caixa_quitacao`; a migration adiciona esses campos
e as FKs para usuário e caixa, sem alterar pagamentos antigos e sem linha `USE`. Não é executada automaticamente.

- `/fiado`: ADMIN e ATENDENTE consultam clientes devedores, expandem os pedidos e quitam um pagamento ou
  todos os pendentes do cliente. O diálogo pede a forma e a confirmação do recebimento. Dinheiro aceita
  valor recebido opcional, com vírgula ou ponto, e mostra o troco.
- `/pagamento`: consulta somente leitura, até 200 registros por vez. Filtros `data`, `forma`, `status`,
  `idCaixa` e `limite` em `GET /pagamento`. Quando há quitação, data/forma/caixa se referem ao recebimento;
  caso contrário, ao lançamento. A tabela preserva também os dados originais da venda.
- `GET /pagamento/fiado`: todos os FIADO PENDENTE de pedidos não cancelados, agrupados por cliente.
  Inclui clientes inativos com dívida e não limita por dia.
- `POST /pagamento/:id/quitar` e `POST /pagamento/cliente/:idCliente/quitar`: corpo `{ "forma": "PIX" }`
  ou `{ "forma": "DINHEIRO", "valorRecebido": 100 }`. Formas: DINHEIRO, PIX, DEBITO e CREDITO.
  Valor recebido omitido/null em dinheiro deixa recebido/troco null; nas outras formas, não enviar o campo.
  Usuário e caixa são determinados pelo servidor, e a forma original permanece FIADO.

As quitações usam uma transação e bloqueiam pedidos e pagamentos em ordem consistente, antes de ler o
caixa aberto com `for share`. O update exige FIADO PENDENTE e confere as linhas alteradas. O lote é
integral: se uma pendência selecionada mudar durante a disputa, nenhuma quitação é gravada. Pedidos novos
após a seleção ficam para outra quitação. No lote em dinheiro, o troco fica no último pagamento para não
repetir o valor entregue. O saldo usa o valor da dívida, sem somar diretamente o valor recebido.

Para testar pelo Swagger, faça login como ADMIN/ATENDENTE e crie um pedido FIADO com cliente:

1. Consulte `GET /pagamento/fiado` e anote o ID do pagamento e do cliente.
2. Feche o caixa da venda e, sem outro aberto, tente quitar: deve retornar 409. Abra um novo caixa e quite com PIX ou DINHEIRO.
3. Consulte `GET /pagamento` e `GET /caixa/:id/resumo`: deve aparecer a quitação no caixa do recebimento.
   Repetir a quitação retorna 409. Um fiado de caixa anterior mantém a venda na origem.
4. Crie dois fiados do mesmo cliente e use a rota de quitação por cliente; os dois devem ficar PAGO juntos.
5. Teste COZINHA: as quatro rotas de pagamento devem retornar 403.

Testes automatizados com banco simulado: `node --test server/tests/pagamento.test.js server/tests/pedido.test.js server/tests/caixa.test.js`.
Cobrem validações, permissões, cálculo em centavos, filtros, quitação em outro caixa, lote, rollback,
dupla quitação e as duas ordens de disputa com o fechamento. Não substituem a execução da migration
e a conferência do SQL/isolamento no MySQL real. Testes pelo Swagger escrevem no banco configurado.

## Movimentação financeira (RF_F7)

`/financeiro` mostra uma única ENTRADA por caixa FECHADO com recebimentos, junto das despesas (aluguel,
salário, gás, insumos etc.) e entradas avulsas. Enquanto o caixa estiver aberto, seus recebimentos são
acompanhados em Caixa e Pagamento. O detalhe de cada pagamento e a quitação de fiado continuam nessas telas.
A entrada usa a data/hora do fechamento e soma vendas pagas e fiados recebidos naquele caixa, mesmo que
o caixa atravesse dias. Vendas e quitações continuam gravadas somente em `pagamento`; o consolidado é
calculado na consulta, sem criar uma cópia em `movimentacao_financeira` ou mudar o fluxo de fechamento.
O valor da entrada é o total recebido, não o dinheiro contado na gaveta: não inclui abertura, troco ou
diferenças de conferência. Por exemplo, R$ 150 de abertura + R$ 300 de recebimentos geram uma entrada de R$ 300.
O saldo do período é entradas menos saídas; não representa o dinheiro físico da gaveta.
Os lançamentos manuais não exigem caixa aberto nem alteram o dinheiro esperado na gaveta: não são sangrias/suprimentos.
O relatório RF_S3 reutiliza essa consulta e detalha os totais por categoria e forma de pagamento.

- ADMIN cria, edita e exclui lançamentos manuais. ATENDENTE apenas consulta; COZINHA não acessa o financeiro.
- `GET /financeiro?dataInicio=2026-11-01&dataFim=2026-11-30&tipo=SAIDA&categoria=Aluguel`
  retorna `{ movimentacoes, totais: { entradas, saidas, saldo, recebimentosCaixas, entradasAvulsas } }`. Todos os filtros são opcionais.
  O período inclui as duas datas, a categoria é exata conforme a collation do banco e os totais usam todos
  os registros filtrados, sem truncar a listagem. Registros legados com `id_pedido` preenchido são excluídos
  da consulta e dos totais para não duplicar os recebimentos lidos de `pagamento`; a coluna e os dados antigos são preservados.
- Vendas diretas consideram apenas pagamentos PAGO em DINHEIRO, PIX, DEBITO ou CREDITO, pelo caixa do
  pedido e valor efetivo da venda (`valor`, sem somar `valor_recebido`). Fiados só entram quando PAGO,
  no caixa da quitação, sem repetir a receita no caixa da venda. Pagamentos PENDENTE/CANCELADO e pedidos CANCELADO não entram.
  FIADO PAGO legado sem dados completos de quitação não é considerado um recebimento presumido.
- Os consolidados têm `origem: CAIXA`, `id: null`, `idCaixa`, categoria "Fechamento de caixa" e descrição
  "Recebimentos do caixa #N". São somente consulta; o responsável é quem fechou (ou quem abriu, para registro
  legado sem usuário de fechamento). Os lançamentos manuais têm `origem: MANUAL` e as despesas de compra,
  `origem: ESTOQUE`. O período usa o fechamento para caixas e a data/hora informada nos lançamentos manuais.
  Todos os totais seguem os mesmos filtros. Um caixa fechado sem recebimentos ou sem data de fechamento
  não gera entrada. Dois caixas fechados no mesmo dia permanecem como duas entradas. Nenhum join com itens multiplica pagamentos.
- `POST /financeiro` recebe `{ "tipo": "SAIDA", "categoria": "Aluguel", "valor": 500,
  "dataHora": "2026-11-02T10:30", "recorrente": true, "quantidadeMeses": 12 }`, com descrição opcional.
  O valor é maior que zero, até duas casas e no máximo R$ 99.999.999,99. A data/hora é local, editável e sem UTC.
  O responsável vem do JWT; na edição é preservado o usuário que registrou originalmente.
- Recorrência é informativa: meses inteiros de 2 a 2147483647 quando recorrente, null caso contrário.
  Não há parcelas ou lançamentos futuros automáticos; o valor não é multiplicado pelos meses.
- `PUT /financeiro/:id` aceita campos parciais. `DELETE /financeiro/:id` exclui definitivamente, com confirmação
  na interface. Ambos bloqueiam a linha na transação e recusam registros vinculados a estoque ou pedido.

No Estoque, ADMIN pode informar `valorPago` ao registrar `ENTRADA_COMPRA`. O valor é o **total pago**,
gera uma SAIDA em "Compra de insumo" com o mesmo usuário e data/hora do estoque e é gravado na mesma
`ExecutaTransacao` do saldo e histórico. Se qualquer gravação falhar, tudo é desfeito. Sem valor/null,
nada é lançado no financeiro. COZINHA mantém a movimentação de estoque sem valor pago; não pode criar
uma despesa indiretamente. Despesas vinculadas não são editadas/excluídas nesta entrega.

**Banco local e Railway:** aplique uma vez [`server/db/migrations/008-movimentacao-financeira.sql`](server/db/migrations/008-movimentacao-financeira.sql)
depois das migrations anteriores. A tabela já tinha os campos básicos e CHECK de valor positivo; a migration
adiciona a FK opcional de estoque, unicidade por movimentação e CHECK de recorrência. Não seleciona banco,
não executa automaticamente e não corrige dados antigos em silêncio. Antes de aplicar, confira possíveis
recorrências inconsistentes; elas impedem a criação da constraint:

```sql
select id_movimentacao_financeira, recorrente, quantidade_meses
from movimentacao_financeira
where (recorrente = 0 and quantidade_meses is not null)
   or (recorrente = 1 and (quantidade_meses is null or quantidade_meses < 2))
   or recorrente not in (0, 1);
```

**Swagger:** faça login como ADMIN, crie um lançamento manual, consulte por período, edite a data e exclua.
Lance uma venda de R$ 40,00 em dinheiro com R$ 50,00 recebido: `GET /financeiro` ainda não deve incluir
esse recebimento com o caixa aberto. Feche o caixa e consulte pela data do fechamento: deve aparecer uma
entrada de R$ 40,00 em "Fechamento de caixa", sem abertura nem troco. Atualizar não deve duplicar a entrada.
Crie um FIADO e quite em outro caixa: só deve integrar o financeiro no fechamento do caixa que recebeu.
Confira também um caixa aberto em um dia e fechado no seguinte: toda a entrada fica na data do fechamento.
Tente valor zero e recorrência de 1 mês: devem retornar 400. Registre uma ENTRADA_COMPRA em
`POST /estoque/movimentacoes` com `valorPago`, confira a saída em `GET /financeiro` e tente editá-la/excluí-la:
deve retornar 409. ATENDENTE consulta, mas recebe 403 nas três escritas; COZINHA recebe 403 no financeiro
e ao informar valor pago no estoque. Os testes de escrita no Swagger alteram o banco configurado.

Testes: `node --test server/tests/financeiro.test.js server/tests/pedido.test.js server/tests/pagamento.test.js server/tests/caixa.test.js`.
O banco simulado cobre permissões, validação, recorrência, totais em centavos, caixa aberto sem entrada,
consolidação após POST /caixa/fechar, duplicação, troco, quitação em outro caixa, filtros pela data de fechamento,
cancelados, vínculos protegidos e rollback do fechamento e de saldo/histórico/despesa.
Não substitui testar a migration e o SQL em MySQL 8 real. Alterações diretas no banco mudam o consolidado calculado;
não existe snapshot gravado nem conciliação automática de pagamentos duplicados inseridos manualmente.
A consolidação por caixa fechado não exige migration adicional à 008.

## Atualização do banco para pedidos

Aplique uma única vez [`server/db/migrations/005-pedido.sql`](server/db/migrations/005-pedido.sql)
no banco já atualizado com as migrations anteriores. A tabela `pedido` deve estar vazia.
A migration não seleciona banco e adiciona somente os campos do pedido, mistura, produto e pagamento.
Produtos existentes passam a usar o cardápio por padrão; desmarque "Escolhe mistura e adicionais do dia"
nos produtos que não devem aceitar essas opções, como refrigerantes.

RF_F2 está pronto no backend e no frontend, na rota `/pedidos`. ADMIN e ATENDENTE lançam pedidos;
COZINHA consulta a lista, os detalhes, avança o preparo e imprime a comanda. O pedido não baixa estoque.
Execute `node --test server/tests/pedido.test.js` na raiz para os testes com banco simulado:
eles exercitam autenticação, rotas, regras, serialização e o controle de transação com falhas de gravação.
Esses testes não substituem a conferência das migrations, constraints e bloqueios em MySQL 8 real.

## Status, cancelamento e comanda (RF_F3)

Aplique uma única vez [`server/db/migrations/006-pedido-status.sql`](server/db/migrations/006-pedido-status.sql)
no banco já atualizado com a migration 005. Adiciona motivo, horário e usuário do cancelamento em `pedido`;
os horários de pronto e saída já existem. Nenhuma migration é aplicada automaticamente.

- `PUT /pedido/:id/status`: RECEBIDO → EM_PREPARO → PRONTO, com SAIU_ENTREGA somente em DELIVERY.
  ADMIN e ATENDENTE avançam todas as etapas; COZINHA somente EM_PREPARO e PRONTO. Não permite pular ou voltar.
- `POST /pedido/:id/cancelar`: ADMIN e ATENDENTE informam motivo de 3 a 255 caracteres. Bloqueia o pedido
  e consulta seu caixa com bloqueio compartilhado: se o fechamento vencer a disputa, o cancelamento é recusado;
  se o cancelamento vencer, o fechamento aguarda sua conclusão. Pedido e todos os pagamentos são cancelados
  na mesma transação, sem baixa/devolução de estoque nem exclusão do histórico.
- Os GETs incluem os horários e os dados de cancelamento. A tela oferece os próximos passos permitidos,
  filtra por status e atualiza a lista de hoje a cada 30 segundos, sem sobrepor chamadas. Pausa com aba
  oculta, modal aberto ou data histórica; o botão Atualizar continua disponível.
- Imprimir comanda no detalhe ou no resumo do lançamento abre a impressão do navegador. O portal de impressão
  mostra somente o cupom de 80 mm, com itens, observações, pagamento, total e faixa CANCELADO quando aplicável.
  Configure a impressora para papel de 80 mm; a impressão não é automática.

Testes: `node --test server/tests/pedido.test.js server/tests/caixa.test.js` cobre criação existente,
transições, permissões, cancelamento, conflitos e rollback com banco simulado. Conferir a migration,
os bloqueios no MySQL real e a impressão na impressora utilizada continua sendo necessário.

## Atualização do banco para opções de mistura e adicionais

Para um banco existente que já contém `cardapio_preparacao` e `adicional`, aplique uma única vez
[`server/db/migrations/002-cardapio-opcoes-adicionais.sql`](server/db/migrations/002-cardapio-opcoes-adicionais.sql).
As preparações já salvas ficam no grupo de itens fixos (`grupo NULL`). Para um banco novo,
use o schema completo atualizado em `database/schema-restaurante-escopo-atual.sql`.

O cardápio recebe `preparacoes: [{ nome, grupo }]` (`grupo` é `null` ou `"Mistura"`) e
`adicionais: [id]`. A consulta devolve nome e preço atual dos adicionais, inclusive os que
foram inativados depois, preservando o vínculo no histórico. Salvar e reutilizar exigem
que os adicionais selecionados estejam ativos; a tela permite remover os inativos.

## Padrão pra criar uma nova entidade (ex: RF_B2 Produtos)

1. `entities/produtoEntity.js` — copiar `usuarioEntity.js`, trocar campos e `toMap()`.
2. `repositories/produtoRepository.js` — copiar `usuarioRepository.js`, trocar SQL.
3. `services/produtoService.js` — regra de negócio específica (se houver).
4. `controllers/produtoController.js` — copiar `usuarioController.js`.
5. `routes/produtoRoute.js` — copiar `usuarioRoute.js`, ajustar `auth.permitir(...)`.
6. Registrar em `routes/index.js`.
