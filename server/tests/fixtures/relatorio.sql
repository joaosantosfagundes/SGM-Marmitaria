create table usuario (id_usuario int primary key, nome varchar(100), email varchar(100), perfil varchar(20), ativo int);
create table cliente (id_cliente int primary key, nome varchar(100));
create table caixa (id_caixa int primary key, id_usuario_abertura int, id_usuario_fechamento int,
    status varchar(20), data_fechamento datetime, valor_abertura decimal(10,2), valor_fechamento decimal(10,2));
create table pedido (id_pedido int primary key, data_hora datetime, status varchar(20), tipo_atendimento varchar(20),
    valor_total decimal(10,2), id_caixa int, id_cliente int);
create table pagamento (id_pagamento int primary key, id_pedido int, forma_pagamento varchar(20), status varchar(20),
    data_hora datetime, forma_quitacao varchar(20), data_quitacao datetime, valor decimal(10,2),
    valor_recebido decimal(10,2), id_caixa_quitacao int, id_usuario_quitacao int);
create table movimentacao_financeira (id_movimentacao_financeira int primary key, id_usuario int, id_pedido int,
    id_movimentacao_estoque int, tipo varchar(20), categoria varchar(100), descricao varchar(255), valor decimal(10,2),
    data_hora datetime, recorrente int, quantidade_meses int);
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
insert into cliente values (1, 'Ana'), (2, 'Bruno'), (3, 'Carla'), (4, 'Diego');
insert into caixa values
    (1, 1, 1, 'FECHADO', '2026-11-10 09:00:00', 150.00, 500.00),
    (2, 1, 2, 'FECHADO', '2026-11-14 00:00:00', 150.00, 680.00),
    (3, 2, null, 'ABERTO', null, 100.00, null),
    (4, 2, 1, 'FECHADO', '2026-11-15 23:59:59', 120.00, 0.00);

insert into pedido values
    (1, '2026-11-04 23:59:59', 'PRONTO', 'BALCAO', 100.00, 1, null),
    (2, '2026-11-05 00:00:00', 'PRONTO', 'MESA', 64.25, 1, null),
    (3, '2026-11-05 12:00:00', 'CANCELADO', 'DELIVERY', 100.00, 1, null),
    (4, '2026-11-05 18:00:00', 'RECEBIDO', 'DELIVERY', 32.50, 1, 1),
    (5, '2026-11-06 23:59:59', 'PRONTO', 'BALCAO', 21.25, 1, 4),
    (6, '2026-11-07 00:00:00', 'RECEBIDO', 'BALCAO', 100.00, 1, null),
    (7, '2026-11-06 13:00:00', 'PRONTO', 'MESA', 14.00, 1, null),
    (8, '2026-11-09 12:00:00', 'CANCELADO', 'BALCAO', 20.00, 1, null),
    (9, '2026-11-13 19:00:00', 'PRONTO', 'BALCAO', 40.25, 2, null),
    (10, '2026-11-13 19:05:00', 'PRONTO', 'MESA', 20.50, 2, null),
    (11, '2026-11-13 19:10:00', 'PRONTO', 'BALCAO', 14.25, 2, null),
    (12, '2026-11-13 19:15:00', 'PRONTO', 'MESA', 10.00, 2, null),
    (13, '2026-11-08 15:00:00', 'PRONTO', 'DELIVERY', 30.25, 1, 2),
    (14, '2026-11-08 15:10:00', 'PRONTO', 'BALCAO', 35.75, 1, 2),
    (15, '2026-11-15 23:59:59', 'RECEBIDO', 'BALCAO', 200.00, 3, null),
    (16, '2026-11-08 15:15:00', 'PRONTO', 'MESA', 17.75, 1, 1),
    (17, '2026-11-13 21:30:00', 'PRONTO', 'DELIVERY', 12.25, 2, 1),
    (18, '2026-11-13 21:40:00', 'CANCELADO', 'DELIVERY', 75.00, 2, 3),
    (19, '2026-11-08 15:20:00', 'CANCELADO', 'BALCAO', 70.00, 1, 3),
    (20, '2026-11-13 21:45:00', 'PRONTO', 'BALCAO', 60.00, 2, 3),
    (21, '2026-11-08 15:25:00', 'PRONTO', 'DELIVERY', 19.50, 1, 4),
    (22, '2026-11-15 15:00:00', 'PRONTO', 'BALCAO', 25.25, 4, null);
insert into pagamento values
    (1, 1, 'DINHEIRO', 'PAGO', '2026-11-05 00:00:00', null, null, 100.00, null, null, null),
    (2, 2, 'PIX', 'PAGO', '2026-11-07 09:00:00', null, null, 64.25, null, null, null),
    (3, 3, 'DEBITO', 'CANCELADO', '2026-11-05 12:00:00', null, null, 100.00, null, null, null),
    (4, 4, 'FIADO', 'PENDENTE', '2026-11-05 18:00:00', null, null, 32.50, null, null, null),
    (5, 5, 'FIADO', 'PAGO', '2026-11-06 23:59:59', 'DINHEIRO', '2026-11-10 09:00:00', 21.25, null, 1, 1),
    (6, 6, 'CREDITO', 'PAGO', '2026-11-07 00:00:00', null, null, 100.00, null, null, null),
    (7, 2, 'CREDITO', 'PAGO', '2026-11-07 09:00:01', null, null, 64.25, null, null, null),
    (9, 9, 'DINHEIRO', 'PAGO', '2026-11-13 19:00:00', null, null, 40.25, 50.00, null, null),
    (10, 10, 'PIX', 'PAGO', '2026-11-13 19:05:00', null, null, 20.50, null, null, null),
    (11, 11, 'DEBITO', 'PAGO', '2026-11-13 19:10:00', null, null, 14.25, null, null, null),
    (12, 12, 'CREDITO', 'PAGO', '2026-11-13 19:15:00', null, null, 10.00, null, null, null),
    (13, 13, 'FIADO', 'PAGO', '2026-11-08 15:00:00', 'PIX', '2026-11-13 23:59:59', 30.25, null, 2, 2),
    (14, 14, 'FIADO', 'PAGO', '2026-11-08 15:10:00', 'DINHEIRO', '2026-11-14 00:00:00', 35.75, 50.00, 2, 2),
    (15, 15, 'DINHEIRO', 'PAGO', '2026-11-15 23:59:59', null, null, 200.00, null, null, null),
    (16, 16, 'FIADO', 'PAGO', '2026-11-08 15:15:00', 'CREDITO', '2026-11-15 23:59:59', 17.75, null, 3, 1),
    (17, 17, 'FIADO', 'PENDENTE', '2026-11-13 21:30:00', null, null, 12.25, null, null, null),
    (18, 18, 'FIADO', 'PENDENTE', '2026-11-13 21:40:00', null, null, 75.00, null, null, null),
    (19, 19, 'FIADO', 'PAGO', '2026-11-08 15:20:00', 'PIX', '2026-11-14 00:00:00', 70.00, null, 2, 2),
    (20, 20, 'FIADO', 'CANCELADO', '2026-11-13 21:45:00', null, null, 60.00, null, null, null),
    (21, 21, 'FIADO', 'PAGO', '2026-11-08 15:25:00', 'CREDITO', '2026-11-16 00:00:00', 19.50, null, 3, 2),
    (22, 22, 'PIX', 'PAGO', '2026-11-15 15:00:00', null, null, 25.25, null, null, null);

insert into movimentacao_financeira values
    (1, 1, null, null, 'ENTRADA', 'Outras receitas', 'Entrada avulsa', 10.01, '2026-11-14 00:00:00', 0, null),
    (2, 1, null, null, 'ENTRADA', 'Fechamento de caixa', 'Entrada avulsa', 3.25, '2026-11-15 23:59:59', 0, null),
    (3, 1, null, null, 'SAIDA', 'Aluguel', 'Despesa manual', 70.01, '2026-11-14 14:00:00', 0, null),
    (4, 1, null, 7, 'SAIDA', 'Compra de insumos', 'Compra registrada no estoque', 15.25, '2026-11-15 14:00:00', 0, null),
    (5, 1, 9, null, 'ENTRADA', 'Venda', 'Lançamento legado', 40.25, '2026-11-14 10:00:00', 0, null),
    (6, 1, null, null, 'ENTRADA', 'Outras receitas', 'Entrada posterior', 100.00, '2026-11-16 00:00:00', 0, null),
    (7, 1, null, null, 'SAIDA', 'Aluguel', 'Despesa anterior', 100.00, '2026-11-13 23:59:59', 0, null);

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
