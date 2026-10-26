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
- [ ] RF_F5 — Pagamento
- [ ] RF_F6 — Quitar Devedores
- [ ] RF_F7 — Movimentação Financeira
- [x] RF_F9 — Caixa: Abrir/Fechar, histórico, resumo por forma de pagamento e conferência do dinheiro físico com falta/sobra
- [ ] RF_S1–S5 — Relatórios
- [ ] Deploy

### Ajustes de interface

- [x] Confirmações em diálogo próprio com suporte a teclado, foco controlado e notificações no padrão visual do sistema
- [x] Formulário de adicionais em card acima da lista, no padrão dos demais cadastros

## Resumo financeiro e conferência do caixa

`GET /caixa/:id/resumo` está disponível para ADMIN e ATENDENTE e calcula valores de caixas
abertos ou fechados. Usa `pedido.id_caixa` e `pagamento.id_pedido`, sem filtrar pelo dia:
um caixa aberto ontem inclui todas as suas vendas de hoje até o fechamento.

- **Recebido:** pagamentos PAGO em Dinheiro, Pix, Débito e Crédito, com total e quantidade por forma.
- **Fiado pendente:** somente FIADO PENDENTE; aparece separado e não representa recebimento.
- **Total vendido:** recebido + fiado pendente. O valor de abertura não é faturamento.
- **Saldo esperado na gaveta:** abertura + vendas pagas em dinheiro. Usa `pagamento.valor`,
  não o valor recebido do cliente; o troco já está descontado. `valor_recebido` null equivale ao valor exato.
- **Conferência:** valor contado menos saldo esperado. Zero é Conferido, positivo é Sobra e negativo é Falta.
  Uma diferença não impede fechar; a tela solicita confirmação e permite prosseguir.

Na tela Caixa, Atualizar recarrega o resumo; Ver resumo no histórico consulta qualquer caixa sem editá-lo.
Antes da confirmação e antes de enviar o fechamento, a tela reconsulta os valores. Se as vendas em dinheiro
mudarem durante a confirmação, pede nova conferência. O fechamento aceita `idCaixa` opcional para
proteger a identidade do caixa conferido; clientes antigos podem continuar enviando somente `valorFechamento`.
O update condicional e a leitura do caixa fechado usam uma única `ExecutaTransacao`. O bloqueio exclusivo
aguarda o FOR SHARE dos pedidos já em andamento, e pedidos posteriores não entram no caixa fechado.
O resumo final é consultado depois do fechamento e inclui essas últimas vendas; a confirmação da tela
não reserva o caixa nem mantém uma transação aberta enquanto o usuário decide.

**Limitações:** não inclui sangrias, suprimentos, despesas, taxas, estornos ou recebimentos posteriores de fiado.
Pedidos CANCELADO e pagamentos CANCELADO não contam. O cancelamento de pedido exige caixa aberto e
cancela todos os seus pagamentos; não registra estorno bancário nem retirada/devolução física de dinheiro.
Alterar status diretamente no banco também muda o resumo calculado.
FIADO PAGO não é inferido como dinheiro, Pix ou cartão: uma futura quitação precisará registrar a forma real e
o caixa do recebimento. Cada registro de pagamento válido é somado uma vez, sem join com itens; o fluxo atual
cria um pagamento por pedido, mas duplicações manuais no banco não são conciliadas automaticamente.
Não existe saldo acumulado nem snapshot financeiro gravado, e nenhuma migration é necessária.

Testes: `node --test server/tests/pedido.test.js server/tests/caixa.test.js`. O banco simulado cobre cálculos,
status, permissões, fechamento, rollback e as duas ordens de concorrência S/X; não substitui testes de
SQL, isolamento e bloqueios em MySQL 8 real.

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
