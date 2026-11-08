create table usuario (id_usuario int primary key, nome varchar(100), email varchar(100), perfil varchar(20), ativo int);
create table pedido (id_pedido int primary key, data_hora datetime, status varchar(20), tipo_atendimento varchar(20), valor_total decimal(10,2));
create table pagamento (id_pagamento int primary key, id_pedido int, forma_pagamento varchar(20), status varchar(20),
    data_hora datetime, forma_quitacao varchar(20), data_quitacao datetime);
create table produto (id_produto int primary key, nome varchar(150));
create table adicional (id_adicional int primary key, nome varchar(100));
create table item_pedido (id_item_pedido int primary key, id_pedido int, id_produto int, quantidade int, subtotal decimal(10,2));
create table item_pedido_adicional (id_item_pedido_adicional int primary key, id_item_pedido int, id_adicional int,
    quantidade int, subtotal decimal(10,2));
create table categoria (id_categoria int primary key, nome varchar(100));
create table unidade (id_unidade int primary key, sigla varchar(10));
create table insumo (id_insumo int primary key, nome varchar(150), id_categoria int, id_unidade int, estoque_minimo decimal(10,3), ativo int);
create table estoque (id_insumo int primary key, quantidade decimal(10,3));
create table movimentacao_estoque (id_movimentacao int primary key, id_insumo int, tipo varchar(20), quantidade decimal(10,3), data_hora datetime);

insert into usuario values (1, 'Admin', 'admin@teste.local', 'ADMIN', 1),
    (2, 'Atendente', 'atendente@teste.local', 'ATENDENTE', 1), (3, 'Cozinha', 'cozinha@teste.local', 'COZINHA', 1);

insert into pedido values
    (1, '2026-11-04 23:59:59', 'PRONTO', 'BALCAO', 100.00),
    (2, '2026-11-05 00:00:00', 'PRONTO', 'MESA', 64.25),
    (3, '2026-11-05 12:00:00', 'CANCELADO', 'DELIVERY', 100.00),
    (4, '2026-11-05 18:00:00', 'RECEBIDO', 'DELIVERY', 32.50),
    (5, '2026-11-06 23:59:59', 'PRONTO', 'BALCAO', 21.25),
    (6, '2026-11-07 00:00:00', 'RECEBIDO', 'BALCAO', 100.00),
    (7, '2026-11-06 13:00:00', 'PRONTO', 'MESA', 14.00),
    (8, '2026-11-09 12:00:00', 'CANCELADO', 'BALCAO', 20.00);
insert into pagamento values
    (1, 1, 'DINHEIRO', 'PAGO', '2026-11-05 00:00:00', null, null),
    (2, 2, 'PIX', 'PAGO', '2026-11-07 09:00:00', null, null),
    (3, 3, 'DEBITO', 'CANCELADO', '2026-11-05 12:00:00', null, null),
    (4, 4, 'FIADO', 'PENDENTE', '2026-11-05 18:00:00', null, null),
    (5, 5, 'FIADO', 'PAGO', '2026-11-06 23:59:59', 'DINHEIRO', '2026-11-10 09:00:00'),
    (6, 6, 'CREDITO', 'PAGO', '2026-11-07 00:00:00', null, null),
    (7, 2, 'CREDITO', 'PAGO', '2026-11-07 09:00:01', null, null);

insert into produto values (1, 'Marmita'), (2, 'Suco'), (3, 'Salada');
insert into adicional values (1, 'Farofa'), (2, 'Ovo');
insert into item_pedido values
    (1, 1, 1, 5, 100.00), (2, 2, 1, 2, 40.00), (3, 2, 2, 3, 15.00), (4, 3, 1, 4, 80.00),
    (5, 4, 2, 5, 25.00), (6, 5, 1, 1, 20.00), (7, 6, 1, 5, 100.00), (8, 7, 3, 1, 14.00);
insert into item_pedido_adicional values
    (1, 2, 1, 1, 2.50), (2, 2, 2, 2, 6.75), (3, 4, 2, 5, 20.00), (4, 5, 2, 2, 7.50), (5, 6, 1, 1, 1.25);

insert into categoria values (1, 'Mercearia');
insert into unidade values (1, 'kg'), (2, 'L');
insert into insumo values (1, 'Arroz', 1, 1, 5.000, 1), (2, 'Óleo', 1, 2, 2.000, 1), (3, 'Sal', 1, 1, 0.250, 1);
insert into estoque values (1, 3.250), (2, 2.000);
insert into movimentacao_estoque values
    (1, 1, 'ENTRADA_COMPRA', 20.000, '2026-11-04 23:59:59'),
    (2, 1, 'ENTRADA_COMPRA', 10.125, '2026-11-05 00:00:00'),
    (3, 1, 'PERDA', 1.250, '2026-11-05 12:00:00'),
    (4, 1, 'AJUSTE_ENTRADA', 2.500, '2026-11-06 09:00:00'),
    (5, 1, 'AJUSTE_SAIDA', 0.125, '2026-11-06 23:59:59'),
    (6, 1, 'PERDA', 50.000, '2026-11-07 00:00:00'),
    (7, 2, 'ENTRADA_COMPRA', 3.750, '2026-11-05 16:00:00');
