-- Aplicar uma única vez no banco existente.
-- Corrija eventuais adicionais com preço menor ou igual a zero antes de aplicar.
USE sistema_restaurante;

ALTER TABLE adicional
    DROP CHECK chk_adicional_preco,
    ADD CONSTRAINT chk_adicional_preco CHECK (preco > 0);
