alter table pagamento
    add column id_usuario_quitacao int null after data_hora,
    add column data_quitacao datetime null after id_usuario_quitacao,
    add column forma_quitacao enum('DINHEIRO','PIX','DEBITO','CREDITO') null after data_quitacao,
    add column id_caixa_quitacao int null after forma_quitacao,
    add constraint fk_pagamento_usuario_quitacao foreign key (id_usuario_quitacao) references usuario(id_usuario),
    add constraint fk_pagamento_caixa_quitacao foreign key (id_caixa_quitacao) references caixa(id_caixa);
