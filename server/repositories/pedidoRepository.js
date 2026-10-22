import Repository from "./repository.js";
import PedidoEntity from "../entities/pedidoEntity.js";
import ItemPedidoEntity from "../entities/itemPedidoEntity.js";
import ItemPedidoAdicionalEntity from "../entities/itemPedidoAdicionalEntity.js";
import PagamentoEntity from "../entities/pagamentoEntity.js";

const CONSULTA_PEDIDOS = `select p.*, u.nome as nome_usuario, c.nome as nome_cliente from pedido p
    inner join usuario u on u.id_usuario = p.id_usuario
    left join cliente c on c.id_cliente = p.id_cliente`;

export default class PedidoRepository extends Repository {
    async listar({ status, idCaixa, limite }) {
        let sql = `select p.*, u.nome as nome_usuario, c.nome as nome_cliente,
            pg.forma_pagamento, pg.status as status_pagamento from pedido p
            inner join usuario u on u.id_usuario = p.id_usuario
            left join cliente c on c.id_cliente = p.id_cliente
            left join pagamento pg on pg.id_pedido = p.id_pedido where 1 = 1`;
        let valores = [];
        if (status !== undefined) { sql += " and p.status = ?"; valores.push(status); }
        if (idCaixa !== undefined) { sql += " and p.id_caixa = ?"; valores.push(idCaixa); }
        sql += " order by p.data_hora desc, p.id_pedido desc limit ?";
        valores.push(limite);
        let rows = await this.banco.ExecutaComando(sql, valores);
        return rows.map(row => {
            let pedido = PedidoEntity.toMap(row);
            return {
                id: pedido.id, idCaixa: pedido.idCaixa, dataHora: pedido.dataHora, status: pedido.status,
                tipoAtendimento: pedido.tipoAtendimento, nomeCliente: pedido.nomeCliente,
                valorTotal: pedido.valorTotal, formaPagamento: row.forma_pagamento,
                statusPagamento: row.status_pagamento, nomeUsuario: pedido.nomeUsuario,
            };
        });
    }

    async obter(id, consultar) {
        let carregar = async consultar => {
            let rows = await consultar(`${CONSULTA_PEDIDOS} where p.id_pedido = ?`, [id]);
            if (!rows.length) return null;
            let pedido = PedidoEntity.toMap(rows[0]);
            let itens = await consultar(
                `select ip.*, p.nome as nome_produto from item_pedido ip
                 inner join produto p on p.id_produto = ip.id_produto
                 where ip.id_pedido = ? order by ip.id_item_pedido`, [id]
            );
            let adicionais = await consultar(
                `select ipa.*, a.nome as nome_adicional from item_pedido_adicional ipa
                 inner join adicional a on a.id_adicional = ipa.id_adicional
                 inner join item_pedido ip on ip.id_item_pedido = ipa.id_item_pedido
                 where ip.id_pedido = ? order by ipa.id_item_pedido_adicional`, [id]
            );
            pedido.itens = itens.map(row => {
                let item = ItemPedidoEntity.toMap(row);
                item.adicionais = adicionais.filter(adicional => adicional.id_item_pedido === item.id)
                    .map(adicional => ItemPedidoAdicionalEntity.toMap(adicional));
                return item;
            });
            let pagamentos = await consultar("select * from pagamento where id_pedido = ? order by id_pagamento limit 1", [id]);
            pedido.pagamento = pagamentos.length ? PagamentoEntity.toMap(pagamentos[0]) : null;
            return pedido;
        };
        return consultar ? carregar(consultar) : this.banco.ExecutaTransacao(carregar);
    }

    async criar(pedido, preparar) {
        return this.banco.ExecutaTransacao(async consultar => {
            // O Service consulta os catálogos e aplica as regras usando esta mesma conexão.
            await preparar(consultar);
            let resultado = await consultar(
                `insert into pedido (id_caixa, id_usuario, id_cliente, status, tipo_atendimento,
                 endereco_entrega, observacao, valor_total) values (?, ?, ?, 'RECEBIDO', ?, ?, ?, ?)`,
                [pedido.idCaixa, pedido.idUsuario, pedido.idCliente, pedido.tipoAtendimento,
                    pedido.enderecoEntrega, pedido.observacao, pedido.valorTotal]
            );
            pedido.id = resultado.insertId;
            for (let item of pedido.itens) {
                let inserido = await consultar(
                    `insert into item_pedido (id_pedido, id_produto, quantidade, preco_unitario, subtotal,
                     opcao_mistura, observacao) values (?, ?, ?, ?, ?, ?, ?)`,
                    [pedido.id, item.idProduto, item.quantidade, item.precoUnitario, item.subtotal, item.opcaoMistura, item.observacao]
                );
                for (let adicional of item.adicionais) {
                    await consultar(
                        `insert into item_pedido_adicional (id_item_pedido, id_adicional, quantidade,
                         preco_unitario, subtotal) values (?, ?, ?, ?, ?)`,
                        [inserido.insertId, adicional.idAdicional, adicional.quantidade, adicional.precoUnitario, adicional.subtotal]
                    );
                }
            }
            let pagamento = pedido.pagamento;
            await consultar(
                "insert into pagamento (id_pedido, forma_pagamento, valor, status, valor_recebido) values (?, ?, ?, ?, ?)",
                [pedido.id, pagamento.forma, pagamento.valor, pagamento.status, pagamento.valorRecebido]
            );
            return this.obter(pedido.id, consultar);
        });
    }
}
