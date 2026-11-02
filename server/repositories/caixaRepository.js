import CaixaEntity from "../entities/caixaEntity.js";
import ResumoCaixaEntity from "../entities/resumoCaixaEntity.js";
import Repository from "./repository.js";

export default class CaixaRepository extends Repository {
    async listar() {
        let rows = await this.banco.ExecutaComando(
            `select c.*, u.nome as nome_usuario_abertura, uf.nome as nome_usuario_fechamento from caixa c
             inner join usuario u on u.id_usuario = c.id_usuario_abertura
             left join usuario uf on uf.id_usuario = c.id_usuario_fechamento
             order by c.data_abertura desc, c.id_caixa desc limit 10`
        );
        return rows.map(row => CaixaEntity.toMap(row));
    }

    async obterAtual(consultar) {
        let executar = consultar ?? this.banco.ExecutaComando.bind(this.banco);
        let rows = await executar(
            `select c.*, u.nome as nome_usuario_abertura, uf.nome as nome_usuario_fechamento from caixa c
             inner join usuario u on u.id_usuario = c.id_usuario_abertura
             left join usuario uf on uf.id_usuario = c.id_usuario_fechamento
             where c.status = 'ABERTO' limit 1` + (consultar ? " for share" : "")
        );
        return rows.length ? CaixaEntity.toMap(rows[0]) : null;
    }

    async obter(id, consultar) {
        let executar = consultar ?? this.banco.ExecutaComando.bind(this.banco);
        let rows = await executar(
            `select c.*, u.nome as nome_usuario_abertura, uf.nome as nome_usuario_fechamento from caixa c
             inner join usuario u on u.id_usuario = c.id_usuario_abertura
             left join usuario uf on uf.id_usuario = c.id_usuario_fechamento where c.id_caixa = ?`, [id]
        );
        return rows.length ? CaixaEntity.toMap(rows[0]) : null;
    }

    async obterResumo(id) {
        let rows = await this.banco.ExecutaComando(
            `select c.id_caixa, c.status, c.valor_abertura, c.valor_fechamento,
             coalesce(sum(case when pg.status = 'PAGO' and pg.forma_pagamento = 'FIADO' then pg.valor else 0 end), 0) as total_fiado_quitado,
             coalesce(max(q.total_dinheiro), 0) as fiado_recebido_dinheiro,
             coalesce(max(q.quantidade_dinheiro), 0) as quantidade_fiado_recebido_dinheiro,
             coalesce(max(q.total_pix), 0) as fiado_recebido_pix,
             coalesce(max(q.quantidade_pix), 0) as quantidade_fiado_recebido_pix,
             coalesce(max(q.total_debito), 0) as fiado_recebido_debito,
             coalesce(max(q.quantidade_debito), 0) as quantidade_fiado_recebido_debito,
             coalesce(max(q.total_credito), 0) as fiado_recebido_credito,
             coalesce(max(q.quantidade_credito), 0) as quantidade_fiado_recebido_credito,
             coalesce(sum(case when pg.status = 'PAGO' and pg.forma_pagamento = 'DINHEIRO' then pg.valor else 0 end), 0) as total_dinheiro,
             coalesce(sum(case when pg.status = 'PAGO' and pg.forma_pagamento = 'PIX' then pg.valor else 0 end), 0) as total_pix,
             coalesce(sum(case when pg.status = 'PAGO' and pg.forma_pagamento = 'DEBITO' then pg.valor else 0 end), 0) as total_debito,
             coalesce(sum(case when pg.status = 'PAGO' and pg.forma_pagamento = 'CREDITO' then pg.valor else 0 end), 0) as total_credito,
             coalesce(sum(case when pg.status = 'PENDENTE' and pg.forma_pagamento = 'FIADO' then pg.valor else 0 end), 0) as total_fiado,
             count(case when pg.status = 'PAGO' and pg.forma_pagamento = 'DINHEIRO' then 1 end) as quantidade_dinheiro,
             count(case when pg.status = 'PAGO' and pg.forma_pagamento = 'PIX' then 1 end) as quantidade_pix,
             count(case when pg.status = 'PAGO' and pg.forma_pagamento = 'DEBITO' then 1 end) as quantidade_debito,
             count(case when pg.status = 'PAGO' and pg.forma_pagamento = 'CREDITO' then 1 end) as quantidade_credito,
             count(case when pg.status = 'PENDENTE' and pg.forma_pagamento = 'FIADO' then 1 end) as quantidade_fiado
             from caixa c
             left join pedido p on p.id_caixa = c.id_caixa and p.status <> 'CANCELADO'
             left join pagamento pg on pg.id_pedido = p.id_pedido
             left join (
                select pg.id_caixa_quitacao,
                    sum(case when pg.forma_quitacao = 'DINHEIRO' then pg.valor else 0 end) as total_dinheiro,
                    count(case when pg.forma_quitacao = 'DINHEIRO' then 1 end) as quantidade_dinheiro,
                    sum(case when pg.forma_quitacao = 'PIX' then pg.valor else 0 end) as total_pix,
                    count(case when pg.forma_quitacao = 'PIX' then 1 end) as quantidade_pix,
                    sum(case when pg.forma_quitacao = 'DEBITO' then pg.valor else 0 end) as total_debito,
                    count(case when pg.forma_quitacao = 'DEBITO' then 1 end) as quantidade_debito,
                    sum(case when pg.forma_quitacao = 'CREDITO' then pg.valor else 0 end) as total_credito,
                    count(case when pg.forma_quitacao = 'CREDITO' then 1 end) as quantidade_credito
                from pagamento pg inner join pedido p on p.id_pedido = pg.id_pedido
                where pg.forma_pagamento = 'FIADO' and pg.status = 'PAGO' and p.status <> 'CANCELADO'
                group by pg.id_caixa_quitacao
             ) q on q.id_caixa_quitacao = c.id_caixa
             where c.id_caixa = ?
             group by c.id_caixa, c.status, c.valor_abertura, c.valor_fechamento`, [id]
        );
        return rows.length ? ResumoCaixaEntity.toMap(rows[0]) : null;
    }

    async gravar(entidade) {
        entidade.id = await this.banco.ExecutaComandoLastInserted(
            "insert into caixa (id_usuario_abertura, valor_abertura) values (?, ?)",
            [entidade.idUsuarioAbertura, entidade.valorAbertura]
        );
        return true;
    }

    async fechar(entidade) {
        return this.banco.ExecutaTransacao(async consultar => {
            // Aguarda os pedidos e quitações que mantêm for share neste caixa.
            let resultado = await consultar(
                `update caixa set status = 'FECHADO', data_fechamento = now(),
                 id_usuario_fechamento = ?, valor_fechamento = ?
                 where id_caixa = ? and status = 'ABERTO'`,
                [entidade.idUsuarioFechamento, entidade.valorFechamento, entidade.id]
            );
            if (resultado.affectedRows !== 1) return null;
            return this.obter(entidade.id, consultar);
        });
    }
}
