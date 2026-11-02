import Repository from './repository.js';
import PagamentoEntity from '../entities/pagamentoEntity.js';

const CONSULTA = `select pg.*, p.id_cliente, p.id_caixa, p.status as status_pedido,
    c.nome as nome_cliente, c.telefone as telefone_cliente, u.nome as nome_usuario_quitacao
    from pagamento pg inner join pedido p on p.id_pedido = pg.id_pedido
    left join cliente c on c.id_cliente = p.id_cliente
    left join usuario u on u.id_usuario = pg.id_usuario_quitacao`;

export default class PagamentoRepository extends Repository {
    async listar({ data, forma, status, idCaixa, limite }) {
        let sql = `${CONSULTA} where 1 = 1`, valores = [];
        if (data !== undefined) {
            sql += ` and ((pg.data_quitacao is not null and pg.data_quitacao >= ? and pg.data_quitacao < date_add(?, interval 1 day))
                or (pg.data_quitacao is null and pg.data_hora >= ? and pg.data_hora < date_add(?, interval 1 day)))`;
            valores.push(data, data, data, data);
        }
        if (forma !== undefined) { sql += ' and coalesce(pg.forma_quitacao, pg.forma_pagamento) = ?'; valores.push(forma); }
        if (status !== undefined) { sql += ' and pg.status = ?'; valores.push(status); }
        if (idCaixa !== undefined) { sql += ' and coalesce(pg.id_caixa_quitacao, p.id_caixa) = ?'; valores.push(idCaixa); }
        sql += ' order by coalesce(pg.data_quitacao, pg.data_hora) desc, pg.id_pagamento desc limit ?';
        valores.push(limite);
        let rows = await this.banco.ExecutaComando(sql, valores);
        return rows.map(row => PagamentoEntity.toMap(row));
    }

    async listarFiado() {
        let rows = await this.banco.ExecutaComando(`${CONSULTA}
            where pg.forma_pagamento = 'FIADO' and pg.status = 'PENDENTE' and p.status <> 'CANCELADO'
            order by c.nome, p.id_cliente, pg.data_hora, pg.id_pagamento`);
        return rows.map(row => PagamentoEntity.toMap(row));
    }

    async quitar({ id, idCliente }, preparar) {
        return this.banco.ExecutaTransacao(async consultar => {
            let sql = `select pg.id_pagamento, pg.id_pedido from pagamento pg
                inner join pedido p on p.id_pedido = pg.id_pedido where `;
            let alvos = await consultar(sql + (id !== undefined ? 'pg.id_pagamento = ?'
                : "p.id_cliente = ? and pg.forma_pagamento = 'FIADO' and pg.status = 'PENDENTE' and p.status <> 'CANCELADO'"), [id ?? idCliente]);
            let pedidos = [];
            // A mesma ordem do cancelamento evita disputa circular entre pedido e pagamento.
            for (let idPedido of [...new Set(alvos.map(alvo => alvo.id_pedido))].sort((a, b) => a - b)) {
                let rows = await consultar('select * from pedido where id_pedido = ? for update', [idPedido]);
                pedidos.push(...rows);
            }
            let pagamentos = [];
            for (let alvo of alvos.sort((a, b) => a.id_pagamento - b.id_pagamento)) {
                let rows = await consultar('select * from pagamento where id_pagamento = ? for update', [alvo.id_pagamento]);
                pagamentos.push(...rows.map(row => PagamentoEntity.toMap(row)));
            }
            let quitacao = await preparar(pagamentos, pedidos, consultar);
            let atualizados = [];
            for (let [indice, pagamento] of pagamentos.entries()) {
                let resultado = await consultar(`update pagamento set status = 'PAGO', id_usuario_quitacao = ?,
                    data_quitacao = now(), forma_quitacao = ?, id_caixa_quitacao = ?, valor_recebido = ?
                    where id_pagamento = ? and forma_pagamento = 'FIADO' and status = 'PENDENTE'`,
                    [quitacao.idUsuario, quitacao.forma, quitacao.idCaixaQuitacao, quitacao.valoresRecebidos[indice], pagamento.id]);
                quitacao.conferirAtualizacao(resultado.affectedRows);
                let rows = await consultar(`${CONSULTA} where pg.id_pagamento = ?`, [pagamento.id]);
                atualizados.push(PagamentoEntity.toMap(rows[0]));
            }
            return { pagamentos: atualizados, quantidade: atualizados.length, total: quitacao.total,
                forma: quitacao.forma, idCaixaQuitacao: quitacao.idCaixaQuitacao,
                valorRecebido: quitacao.valorRecebido, troco: quitacao.troco };
        });
    }
}
