alter table movimentacao_financeira
    add column id_movimentacao_estoque int null after id_pedido,
    add constraint fk_financeiro_movimentacao_estoque foreign key (id_movimentacao_estoque) references movimentacao_estoque(id_movimentacao),
    add constraint uq_financeiro_movimentacao_estoque unique (id_movimentacao_estoque),
    add constraint chk_financeiro_recorrencia check (
        (recorrente = 0 and quantidade_meses is null)
        or (recorrente = 1 and quantidade_meses is not null and quantidade_meses >= 2)
    );
