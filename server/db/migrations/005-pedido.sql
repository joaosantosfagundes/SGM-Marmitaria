-- A tabela pedido deve estar vazia antes desta atualização.
alter table pedido
    add column id_caixa int not null after id_usuario,
    add column endereco_entrega varchar(255) null after tipo_atendimento,
    add constraint fk_pedido_caixa foreign key (id_caixa) references caixa(id_caixa);

alter table item_pedido add column opcao_mistura varchar(150) null after subtotal;
alter table produto add column usa_cardapio boolean not null default true after ativo;
alter table pagamento add column valor_recebido decimal(10,2) null after valor;
