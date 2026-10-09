-- Aplicar uma única vez no banco existente que já possui cardapio_preparacao e adicional.
-- As preparações existentes permanecem como itens fixos (grupo NULL).
USE sistema_restaurante;

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
