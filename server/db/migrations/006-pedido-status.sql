alter table pedido
    add column motivo_cancelamento varchar(255) null after hora_saiu_entrega,
    add column hora_cancelamento datetime null after motivo_cancelamento,
    add column id_usuario_cancelamento int null after hora_cancelamento,
    add constraint fk_pedido_usuario_cancelamento foreign key (id_usuario_cancelamento) references usuario(id_usuario);
