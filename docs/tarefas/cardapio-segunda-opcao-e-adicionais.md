# Tarefa: Cardápio do Dia — segunda opção (grupo "Mistura") e adicionais

<!--
SQL para banco existente (aplicar uma única vez; também disponível em
server/db/migrations/002-cardapio-opcoes-adicionais.sql):

ALTER TABLE cardapio_preparacao
    ADD COLUMN grupo VARCHAR(50) NULL AFTER nome;

ALTER TABLE adicional
    MODIFY COLUMN id_insumo INT NULL,
    MODIFY COLUMN quantidade_consumida DECIMAL(10,3) NULL;

CREATE TABLE cardapio_adicional (
    id_cardapio_adicional INT AUTO_INCREMENT PRIMARY KEY,
    id_cardapio INT NOT NULL,
    id_adicional INT NOT NULL,
    CONSTRAINT uq_cardapio_adicional UNIQUE (id_cardapio, id_adicional),
    CONSTRAINT fk_cardapio_adicional_cardapio FOREIGN KEY (id_cardapio) REFERENCES cardapio(id_cardapio),
    CONSTRAINT fk_cardapio_adicional_adicional FOREIGN KEY (id_adicional) REFERENCES adicional(id_adicional)
);
-->

Leia o AGENTS.md antes. Siga as 5 camadas e o padrão de `produto*` e `cliente*`.

## Contexto
O professor pediu que o cardápio do dia aceite:
1. Opções alternativas na mistura. Ex.: 1ª opção carne, 2ª frango, 3ª ovo. O cliente escolhe uma. Não há limite de opções.
2. Adicionais disponíveis no dia (ovo extra, farofa etc.), com preço fixo vindo do cadastro de adicionais.

Hoje o cardápio salva só uma lista de nomes (`preparacoes: string[]`). O CRUD de adicionais não existe (a tabela existe no schema, mas sem entity/repository/service/controller/route/tela).

## 1. Banco (atualizar `database/schema-restaurante-escopo-atual.sql`)
- `cardapio_preparacao`: adicionar `grupo VARCHAR(50) NULL`. NULL = item fixo do dia (arroz, feijão, salada). `'Mistura'` = itens que são alternativas entre si. A coluna `ordem` define 1ª, 2ª, 3ª opção.
- `adicional`: `id_insumo` e `quantidade_consumida` passam a aceitar NULL (a baixa de estoque é manual, não pode obrigar o vínculo). Manter `nome`, `preco`, `ativo`.
- Nova tabela `cardapio_adicional` (criar DEPOIS da tabela `adicional` no arquivo):
  - `id_cardapio_adicional` INT AUTO_INCREMENT PK
  - `id_cardapio` INT NOT NULL (FK cardapio)
  - `id_adicional` INT NOT NULL (FK adicional)
  - UNIQUE (`id_cardapio`, `id_adicional`)
- Editar os CREATE TABLE do arquivo e deixar, num comentário no topo da tarefa/PR, os ALTER TABLE equivalentes para aplicar em banco já existente.

## 2. Backend — CRUD de Adicional
Criar, seguindo o padrão de produto: `adicionalEntity.js`, `adicionalRepository.js`, `adicionalService.js`, `adicionalController.js`, `adicionalRoute.js`. Registrar em `server/routes/index.js` em `/adicional`.
- Campos: `id`, `nome` (obrigatório, até 100), `preco` (obrigatório, >= 0), `ativo`. `id_insumo` e `quantidade_consumida` opcionais.
- Mesmo comportamento de listar/buscar/criar/editar/excluir-ou-inativar e mesmas permissões da rota de produto.
- Não permitir nome duplicado entre adicionais ativos (se produto já faz isso, seguir igual).

## 3. Backend — Cardápio
Alterar `cardapioEntity.js`, `cardapioRepository.js`, `cardapioService.js`, `cardapioController.js`.

Novo contrato (mantém as mesmas rotas `GET /cardapio?data=`, `PUT /cardapio`, `POST /cardapio/copiar`):

GET e resposta do PUT:
```json
{
  "data": "2026-10-08",
  "preparacoes": [
    { "nome": "Arroz", "grupo": null },
    { "nome": "Carne", "grupo": "Mistura" },
    { "nome": "Frango", "grupo": "Mistura" },
    { "nome": "Ovo", "grupo": "Mistura" }
  ],
  "adicionais": [ { "id": 3, "nome": "Ovo extra", "preco": 2.5 } ]
}
```
Corpo do PUT:
```json
{ "data": "2026-10-08", "preparacoes": [ { "nome": "Arroz", "grupo": null } ], "adicionais": [3, 5] }
```
- A ordem do array define a coluna `ordem`. Ao ler, `order by ordem, id_cardapio_preparacao`.
- Validações no Service: `nome` até 150 caracteres; `grupo` null ou `"Mistura"` (por enquanto só esse valor); sem nomes repetidos dentro do mesmo grupo (ignorar maiúscula/minúscula e espaços); `adicionais` deve ser array de ids que existam e estejam ativos, sem repetidos.
- Salvar (transação): apagar e reinserir `cardapio_preparacao` e `cardapio_adicional` do cardápio, como já é feito hoje.
- Copiar: deve levar também o `grupo` das preparações e os adicionais do dia de origem.
- Continuar devolvendo cardápio vazio (sem erro) quando a data não existe.
- Manter as mensagens de erro em português e o formato `{ status, msg }`.

## 4. Frontend
- Cadastro de Adicionais: trocar o `PlaceholderPage` por uma tela real, copiando a estrutura de `ProdutosPage.jsx` (lista, busca, modal criar/editar, mesma ação de excluir/inativar). Adicionar a entrada no menu (`client/src/lib/menu.js`) junto dos outros cadastros e a rota/título na mesma estrutura das demais.
- `CardapioPage.jsx`: dividir a tela em duas áreas:
  - "Itens fixos do dia" (grupo null): adicionar/remover/reordenar como hoje.
  - "Mistura (opções)" (grupo `Mistura`): adicionar opções na ordem, mostrando "1ª opção", "2ª opção", "3ª opção"…, com remover e reordenar.
  - Seletor "Adicionais do dia" (checkboxes ou multiselect) com os adicionais ativos e o preço de cada.
- A cópia de cardápio de outra data deve refletir mistura e adicionais na tela depois de copiar.
- Usar `apiClient.js`, o padrão de toasts/erros das outras telas e a cor primária `#D85A30`.

## Fora do escopo (não fazer)
- Não mexer em pedido, pagamento ou estoque.
- Não criar tela de escolha da opção pelo cliente (isso entra no RF_F2, Lançar Pedido).
- Não renomear tabelas/colunas existentes.

## Critérios de aceite
- [ ] Cadastro de adicionais funcionando (criar, listar, editar, excluir/inativar), com preço.
- [ ] Salvar um cardápio com itens fixos, 3 opções de mistura em ordem e 2 adicionais; recarregar a página e tudo voltar igual.
- [ ] Copiar um cardápio leva grupo, ordem e adicionais.
- [ ] Adicional inativo ou inexistente é rejeitado no cardápio com mensagem clara.
- [x] Schema atualizado e o checklist do README marcado.
