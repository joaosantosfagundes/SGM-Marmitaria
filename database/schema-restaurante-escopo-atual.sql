-- ============================================================
-- BANCO DE DADOS - SISTEMA DE GESTÃO PARA RESTAURANTE (MARMITAS)
-- ESCOPO ATUAL (sem ficha técnica / lote de produção — ver bloco FUTURO no final)
-- MySQL 8+
-- ============================================================

CREATE DATABASE IF NOT EXISTS sistema_restaurante
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sistema_restaurante;


-- ============================================================
-- 1. FUNDAMENTAIS
-- ============================================================

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('ADMIN', 'ATENDENTE', 'COZINHA') NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categoria (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE unidade (
    id_unidade INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    sigla VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE insumo (
    id_insumo INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    id_categoria INT NOT NULL,
    id_unidade INT NOT NULL,

    -- Distingue se é matéria-prima (usada em receitas, no futuro) ou algo vendido direto (ex: refrigerante)
    -- Sem 'PREPARADO' por enquanto (só entra quando o lote de produção for implementado)
    classificacao ENUM(
        'INSUMO',
        'VENDA_DIRETA'
    ) NOT NULL DEFAULT 'INSUMO',

    preco_custo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estoque_minimo DECIMAL(10,3) NOT NULL DEFAULT 0.000,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_insumo_categoria FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
    CONSTRAINT fk_insumo_unidade FOREIGN KEY (id_unidade) REFERENCES unidade(id_unidade)
);


-- ============================================================
-- 2. CARDÁPIO (PREÇO FIXO)
-- ============================================================
-- produto     -> catálogo de tudo que é vendido, CADA ITEM COM SEU PRÓPRIO PREÇO
-- cardapio_item  -> apenas controla o que está DISPONÍVEL no dia (sem preço, herda de produto)
-- Sem ligação com ficha técnica por enquanto — baixa de estoque é manual (ver seção 8).

CREATE TABLE produto (
    id_produto INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao VARCHAR(255),
    preco_padrao DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- preço fixo do item (muda só em reajuste)
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cardapio (
    id_cardapio INT AUTO_INCREMENT PRIMARY KEY,
    data_cardapio DATE NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cardapio_item (
    id_cardapio_item INT AUTO_INCREMENT PRIMARY KEY,
    id_cardapio INT NOT NULL,
    id_produto INT NOT NULL,
    disponivel BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_cardapio_item UNIQUE (id_cardapio, id_produto),
    CONSTRAINT fk_cardapio_item_cardapio FOREIGN KEY (id_cardapio) REFERENCES cardapio(id_cardapio),
    CONSTRAINT fk_cardapio_item_item FOREIGN KEY (id_produto) REFERENCES produto(id_produto)
);


-- ============================================================
-- 3. ADICIONAIS
-- ============================================================

CREATE TABLE adicional (
    id_adicional INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    id_insumo INT NOT NULL,
    quantidade_consumida DECIMAL(10,3) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_adicional_insumo FOREIGN KEY (id_insumo) REFERENCES insumo(id_insumo),
    CONSTRAINT chk_adicional_quantidade CHECK (quantidade_consumida > 0),
    CONSTRAINT chk_adicional_preco CHECK (preco >= 0)
);


-- ============================================================
-- 4. ESTOQUE GERAL
-- ============================================================

CREATE TABLE estoque (
    id_estoque INT AUTO_INCREMENT PRIMARY KEY,
    id_insumo INT NOT NULL UNIQUE,
    quantidade DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_estoque_insumo FOREIGN KEY (id_insumo) REFERENCES insumo(id_insumo),
    CONSTRAINT chk_estoque_quantidade CHECK (quantidade >= 0)
);


-- ============================================================
-- 5. CLIENTE (NOVO — pra fiado)
-- ============================================================

CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(30),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 6. PEDIDO
-- ============================================================
-- Fluxo de status: RECEBIDO -> EM_PREPARO -> PRONTO -> SAIU_ENTREGA
-- Sem status ENTREGUE (ninguém confirma a entrega final) e sem motoboy (cadastro removido do escopo).
-- CANCELADO pode acontecer em qualquer ponto do fluxo.

CREATE TABLE pedido (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_cliente INT NULL, -- só preenchido quando o pedido é fiado (ou, no futuro, delivery com cadastro)
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status ENUM('RECEBIDO','EM_PREPARO','PRONTO','SAIU_ENTREGA','CANCELADO') NOT NULL DEFAULT 'RECEBIDO',
    tipo_atendimento ENUM('MESA','BALCAO','DELIVERY') NOT NULL DEFAULT 'BALCAO',

    hora_pronto DATETIME NULL,
    hora_saiu_entrega DATETIME NULL,

    observacao VARCHAR(255),
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT fk_pedido_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

CREATE TABLE item_pedido (
    id_item_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_produto INT NOT NULL,

    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL, -- salva o valor no momento da venda (histórico)
    subtotal DECIMAL(10,2) NOT NULL,
    observacao VARCHAR(255),

    CONSTRAINT fk_item_pedido_pedido FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido),
    CONSTRAINT fk_item_pedido_venda FOREIGN KEY (id_produto) REFERENCES produto(id_produto),
    CONSTRAINT chk_item_pedido_quantidade CHECK (quantidade > 0)
);

CREATE TABLE item_pedido_adicional (
    id_item_pedido_adicional INT AUTO_INCREMENT PRIMARY KEY,
    id_item_pedido INT NOT NULL,
    id_adicional INT NOT NULL,

    quantidade INT NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_ipa_item_pedido FOREIGN KEY (id_item_pedido) REFERENCES item_pedido(id_item_pedido),
    CONSTRAINT fk_ipa_adicional FOREIGN KEY (id_adicional) REFERENCES adicional(id_adicional),
    CONSTRAINT chk_ipa_quantidade CHECK (quantidade > 0)
);


-- ============================================================
-- 7. MOVIMENTAÇÃO DO ESTOQUE GERAL (manual, sem lote por enquanto)
-- ============================================================

CREATE TABLE movimentacao_estoque (
    id_movimentacao INT AUTO_INCREMENT PRIMARY KEY,
    id_insumo INT NOT NULL,
    id_usuario INT NOT NULL,

    tipo ENUM('ENTRADA_COMPRA','PERDA','AJUSTE_ENTRADA','AJUSTE_SAIDA') NOT NULL,
    quantidade DECIMAL(10,3) NOT NULL,
    motivo VARCHAR(255),
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mov_estoque_insumo FOREIGN KEY (id_insumo) REFERENCES insumo(id_insumo),
    CONSTRAINT fk_mov_estoque_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CONSTRAINT chk_mov_estoque_quantidade CHECK (quantidade > 0)
);


-- ============================================================
-- 8. PAGAMENTO (inclui FIADO)
-- ============================================================

CREATE TABLE pagamento (
    id_pagamento INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,

    forma_pagamento ENUM('DINHEIRO','PIX','DEBITO','CREDITO','FIADO') NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status ENUM('PENDENTE','PAGO','CANCELADO') NOT NULL DEFAULT 'PENDENTE', -- fiado nasce PENDENTE, vira PAGO na quitação
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pagamento_pedido FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido),
    CONSTRAINT chk_pagamento_valor CHECK (valor > 0)
);


-- ============================================================
-- 9. FINANCEIRO
-- ============================================================

CREATE TABLE movimentacao_financeira (
    id_movimentacao_financeira INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_pedido INT NULL,

    tipo ENUM('ENTRADA','SAIDA') NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    valor DECIMAL(10,2) NOT NULL,

    recorrente BOOLEAN NOT NULL DEFAULT FALSE, -- é uma conta que se repete (ex: aluguel, salário)?
    quantidade_meses INT NULL, -- em quantos meses essa conta se repete (ex: contrato de 12 meses); informativo por enquanto

    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_financeiro_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_financeiro_pedido FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido),
    CONSTRAINT chk_financeiro_valor CHECK (valor > 0)
);


-- ============================================================
-- 10. DADOS INICIAIS
-- ============================================================

INSERT INTO categoria (nome, descricao) VALUES
('Carnes', 'Carnes e proteínas'),
('Grãos', 'Arroz, feijão, massas e similares'),
('Hortifruti', 'Frutas, verduras e legumes'),
('Bebidas', 'Bebidas em geral'),
('Embalagens', 'Embalagens e descartáveis'),
('Laticínios', 'Leite, queijo e derivados'),
('Temperos e Molhos', 'Temperos, molhos e condimentos');

INSERT INTO unidade (nome, sigla) VALUES
('Quilograma', 'kg'),
('Grama', 'g'),
('Unidade', 'un'),
('Litro', 'L'),
('Mililitro', 'ml'),
('Pacote', 'pct');


-- ============================================================
-- BLOCO FUTURO (NÃO EXECUTAR AGORA)
-- ============================================================
-- Só rodar isso quando (e se) for implementar ficha técnica + lote de produção.
-- Não exige mexer em nenhuma tabela além das listadas abaixo.
--
-- ALTER TABLE insumo
--     MODIFY classificacao ENUM('INSUMO','PREPARADO','VENDA_DIRETA') NOT NULL DEFAULT 'INSUMO';
--
-- CREATE TABLE ficha_tecnica (
--     id_ficha_tecnica INT AUTO_INCREMENT PRIMARY KEY,
--     id_produto INT NOT NULL,
--     id_insumo INT NOT NULL,
--     quantidade DECIMAL(10,3) NOT NULL,
--     CONSTRAINT uq_ficha_tecnica UNIQUE (id_produto, id_insumo),
--     CONSTRAINT fk_ficha_produto FOREIGN KEY (id_produto) REFERENCES produto(id_produto),
--     CONSTRAINT fk_ficha_insumo FOREIGN KEY (id_insumo) REFERENCES insumo(id_insumo),
--     CONSTRAINT chk_ficha_quantidade CHECK (quantidade > 0)
-- );
--
-- CREATE TABLE lote_producao (
--     id_lote INT AUTO_INCREMENT PRIMARY KEY,
--     id_insumo INT NOT NULL,
--     id_usuario INT NOT NULL,
--     data_producao DATE NOT NULL,
--     hora_producao TIME NOT NULL,
--     quantidade_produzida DECIMAL(10,3) NOT NULL,
--     quantidade_disponivel DECIMAL(10,3) NOT NULL,
--     status ENUM('DISPONIVEL','ESGOTADO') NOT NULL DEFAULT 'DISPONIVEL',
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT fk_lote_insumo FOREIGN KEY (id_insumo) REFERENCES insumo(id_insumo),
--     CONSTRAINT fk_lote_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
--     CONSTRAINT chk_lote_produzida CHECK (quantidade_produzida > 0),
--     CONSTRAINT chk_lote_disponivel CHECK (quantidade_disponivel >= 0 AND quantidade_disponivel <= quantidade_produzida)
-- );
--
-- ALTER TABLE movimentacao_estoque
--     MODIFY tipo ENUM('ENTRADA_COMPRA','SAIDA_PRODUCAO','PERDA','AJUSTE_ENTRADA','AJUSTE_SAIDA') NOT NULL,
--     ADD COLUMN id_lote INT NULL,
--     ADD CONSTRAINT fk_mov_estoque_lote FOREIGN KEY (id_lote) REFERENCES lote_producao(id_lote);
