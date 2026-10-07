# AGENTS.md — SGM (Sistema de Gestão para Marmitaria)

Estágio curricular (FIPP). Prazo final: código + deploy até 30/11. Avaliação: 01/12 a 12/12.
Todo o texto de interface, mensagens de erro e comentários é em português do Brasil.

## Stack
- Backend: Node.js + Express, mysql2 (SQL puro, SEM ORM), JWT em cookie httpOnly, bcrypt, Resend (e-mail).
- Frontend: Vite + React (SPA, não é Next.js), Bootstrap 5, SCSS, ícones Tabler, ApexCharts.
- Banco: MySQL 8+. Script em `database/schema-restaurante-escopo-atual.sql`.
- Deploy: Oracle Cloud (Linux).

## Arquitetura (backend)
Route → Controller → Service → Repository → Entity → Database

- Entity: representa a linha da tabela, valida os próprios dados (`validar()`), converte de/para JSON.
- Repository: SÓ SQL. Estende o `Repository` base.
- Service: regra de negócio e validações cruzadas.
- Controller: SÓ HTTP (parse do request, status code, chama o Service).
- Route: define as rotas e o controle de acesso com `auth.permitir('ADMIN', ...)`.
- Toda rota nova é registrada em `server/routes/index.js`.
- Para criar uma entidade nova, copie o padrão de `usuario*` / `produto*` / `cliente*`.
- Erros de regra de negócio são lançados como `{ status, msg }` no Service.

## Convenções obrigatórias
- SQL escrito nos repositories em minúsculo. Nada de ORM.
- Sem Socket.IO / tempo real. A "tela da cozinha" é a janela de impressão do navegador.
- Imports devem ter EXATAMENTE a mesma caixa (maiúscula/minúscula) do nome do arquivo. O deploy é Linux e quebra onde o Windows deixa passar.
- Ao mover arquivo para subpasta, corrigir os `../` dos imports.
- Não engolir erros em silêncio (ver `silent` em `apiClient.js`, usado só nas checagens de autenticação em segundo plano).
- Menu e rotas do front vêm de `client/src/lib/menu.js`. Para implementar uma tela, trocar o `PlaceholderPage` pela tela real.
- Cor primária: `#D85A30`. Estilos em `client/src/styles/globals.scss`.

## Vocabulário do domínio (NÃO MUDAR OS NOMES)
- `produto` = item vendável (marmita P/M/G, PF, refrigerante), com preço fixo.
- `insumo` = matéria-prima / material da cozinha.
- `cardapio` = cardápio de uma data (uma linha por data).
- `cardapio_preparacao` = preparações do dia em texto livre, ligadas ao cardápio. Informativo: não baixa estoque.
- `caixa` = controle de abertura/fechamento do caixa do dia.
- Nomes antigos que NÃO devem voltar: `cardapio_item`, `cardapio_composicao`, `item_venda`, `fornecedor`.

## Regras de negócio
- Sem caixa aberto, não é possível criar pedido nem pagamento.
- Fiado exige cliente vinculado, nasce com status PENDENTE, e a quitação registra quem confirmou e quando (`id_usuario_quitacao`, `data_quitacao`).
- Baixa de estoque é manual (movimentação de estoque). Não há baixa automática por pedido.
- Ficha técnica e lote de produção estão FORA do escopo (bloco "FUTURO" do schema). Não implementar.

## Ao entregar uma tarefa
- Seguir as 5 camadas, registrar a rota no `index.js` e proteger com `auth.permitir`.
- Atualizar o `database/schema-restaurante-escopo-atual.sql` se mexer em tabela.
- Marcar o item no checklist do README.
- Não alterar nomes de tabelas/colunas sem avisar.