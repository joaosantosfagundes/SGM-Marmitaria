CREATE TABLE caixa (
    id_caixa INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_abertura INT NOT NULL,
    id_usuario_fechamento INT NULL,
    data_abertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento DATETIME NULL,
    valor_abertura DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    valor_fechamento DECIMAL(10,2) NULL,
    status ENUM('ABERTO','FECHADO') NOT NULL DEFAULT 'ABERTO',
    -- Garante um único caixa aberto; NULL pode se repetir no UNIQUE.
    aberto_unico TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'ABERTO' THEN 1 ELSE NULL END) STORED,

    CONSTRAINT uq_caixa_um_aberto UNIQUE (aberto_unico),
    CONSTRAINT fk_caixa_usuario_abertura FOREIGN KEY (id_usuario_abertura) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_caixa_usuario_fechamento FOREIGN KEY (id_usuario_fechamento) REFERENCES usuario(id_usuario),
    CONSTRAINT chk_caixa_valor_abertura CHECK (valor_abertura >= 0)
);
