alter table pedido
    add index idx_pedido_data (data_hora),
    add index idx_pedido_caixa_status (id_caixa, status);

alter table pagamento
    add index idx_pagamento_status (status),
    add index idx_pagamento_quitacao_data (data_quitacao, data_hora);

alter table movimentacao_estoque
    add index idx_mov_estoque_data (data_hora);

alter table movimentacao_financeira
    add index idx_mov_financeira_data (data_hora);
