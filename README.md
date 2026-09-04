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

### Banco
Rode o `database/schema-restaurante-escopo-atual.sql` no MySQL antes de subir o backend.
⚠️ Esse arquivo ainda está com os nomes antigos (`produto`/`item_venda`/`cardapio_item`).
Atualizar para `insumo`/`produto`/`cardapio_composicao` antes de programar RF_B2 em diante.

### Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev             # http://localhost:5173
```

## Checklist de implementação (por Sprint)

### Sprint 2 (24/08–12/09) — RF_B1–B3
- [x] RF_B1 — Usuários (feito: entity, repository, service, controller, route, login/JWT)
- [ ] RF_B2 — Produtos (copiar o padrão de `usuario*`)
- [ ] RF_B3 — Insumos (copiar o padrão de `usuario*`)

### Sprint 3 (14–26/09) — RF_B4 + RF_F1 + abertura RF_F9
- [ ] RF_B4 — Clientes
- [ ] RF_F1 — Cardápio do Dia
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

## Padrão pra criar uma nova entidade (ex: RF_B2 Produtos)

1. `entities/produtoEntity.js` — copiar `usuarioEntity.js`, trocar campos e `toMap()`.
2. `repositories/produtoRepository.js` — copiar `usuarioRepository.js`, trocar SQL.
3. `services/produtoService.js` — regra de negócio específica (se houver).
4. `controllers/produtoController.js` — copiar `usuarioController.js`.
5. `routes/produtoRoute.js` — copiar `usuarioRoute.js`, ajustar `auth.permitir(...)`.
6. Registrar em `routes/index.js`.
