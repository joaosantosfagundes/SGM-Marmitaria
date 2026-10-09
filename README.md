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
- [ ] RF_F9 — (abre, conclui depois)

### Sprint 4 (28/09–17/10) — RF_F2–F4
- [ ] RF_F2 — Lançar Pedido
- [ ] RF_F3 — Status do Pedido
- [ ] RF_F4 — Movimentação de Estoque (transação sync com `estoque`)

### Sprint 5 (19/10–14/11) — restante + deploy
- [ ] RF_F5 — Pagamento
- [ ] RF_F6 — Quitar Devedores
- [ ] RF_F7 — Movimentação Financeira
- [ ] RF_F8 — Abrir/Fechar Caixa
- [ ] RF_S1–S5 — Relatórios
- [ ] Deploy

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
