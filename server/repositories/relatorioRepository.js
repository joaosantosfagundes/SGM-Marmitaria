import Repository from './repository.js';
import RelatorioEntity from '../entities/relatorioEntity.js';

const TOTAIS_VENDAS = `count(*) as quantidade_pedidos,
    count(case when status <> 'CANCELADO' then 1 end) as quantidade_vendidos,
    count(case when status = 'CANCELADO' then 1 end) as quantidade_cancelados,
    coalesce(sum(case when status <> 'CANCELADO' then valor_total else 0 end), 0) as total_vendido,
    coalesce(sum(case when status = 'CANCELADO' then valor_total else 0 end), 0) as total_cancelado,
    coalesce(sum(case when status <> 'CANCELADO' and forma_pagamento = 'FIADO'
        and status_pagamento = 'PENDENTE' then valor_total else 0 end), 0) as fiado_pendente,
    round(coalesce(avg(case when status <> 'CANCELADO' then valor_total end), 0), 2) as ticket_medio`;

export default class RelatorioRepository extends Repository {
    async vendas(limites) {
        let rows = await this.banco.ExecutaComando(`with pedidos_periodo as (
            select date(p.data_hora) as dia, p.tipo_atendimento, p.status, p.valor_total,
                coalesce(pg.forma_pagamento, 'SEM_PAGAMENTO') as forma_pagamento,
                pg.status as status_pagamento
            from pedido p
            left join pagamento pg on pg.id_pagamento = (
                select min(pg2.id_pagamento) from pagamento pg2 where pg2.id_pedido = p.id_pedido
            )
            where p.data_hora >= ? and p.data_hora <= ?
        )
        select 'resumo' as grupo, '' as chave, ${TOTAIS_VENDAS} from pedidos_periodo
        union all
        select 'porDia', dia, ${TOTAIS_VENDAS} from pedidos_periodo group by dia
        union all
        select 'porFormaPagamento', forma_pagamento, ${TOTAIS_VENDAS}
        from pedidos_periodo group by forma_pagamento
        union all
        select 'porTipoAtendimento', tipo_atendimento, ${TOTAIS_VENDAS}
        from pedidos_periodo group by tipo_atendimento
        union all
        select 'porStatus', status, ${TOTAIS_VENDAS} from pedidos_periodo group by status
        order by grupo, chave`, limites);

        return rows.map(RelatorioEntity.toMapVendas);
    }

    async estoque(limites) {
        let rows = await this.banco.ExecutaComando(`select i.id_insumo, i.nome, i.ativo,
            c.nome as nome_categoria, u.sigla as sigla_unidade, i.estoque_minimo,
            coalesce(e.quantidade, 0) as quantidade, coalesce(m.entradas, 0) as entradas,
            coalesce(m.perdas, 0) as perdas, coalesce(m.ajustes_entrada, 0) as ajustes_entrada,
            coalesce(m.ajustes_saida, 0) as ajustes_saida
        from insumo i
        inner join categoria c on c.id_categoria = i.id_categoria
        inner join unidade u on u.id_unidade = i.id_unidade
        left join estoque e on e.id_insumo = i.id_insumo
        left join (
            select id_insumo,
                sum(case when tipo = 'ENTRADA_COMPRA' then quantidade else 0 end) as entradas,
                sum(case when tipo = 'PERDA' then quantidade else 0 end) as perdas,
                sum(case when tipo = 'AJUSTE_ENTRADA' then quantidade else 0 end) as ajustes_entrada,
                sum(case when tipo = 'AJUSTE_SAIDA' then quantidade else 0 end) as ajustes_saida
            from movimentacao_estoque
            where data_hora >= ? and data_hora <= ?
            group by id_insumo
        ) m on m.id_insumo = i.id_insumo
        order by i.nome, i.id_insumo`, limites);

        return rows.map(RelatorioEntity.toMapEstoque);
    }

    async produtosMaisVendidos(limites) {
        let rows = await this.banco.ExecutaComando(`with pedidos_validos as (
            select id_pedido from pedido
            where data_hora >= ? and data_hora <= ? and status <> 'CANCELADO'
        )
        select 'produtos' as grupo, pr.id_produto as id, pr.nome,
            sum(ip.quantidade) as quantidade, sum(ip.subtotal) as total_vendido
        from pedidos_validos p
        inner join item_pedido ip on ip.id_pedido = p.id_pedido
        inner join produto pr on pr.id_produto = ip.id_produto
        group by pr.id_produto, pr.nome
        union all
        select 'adicionais', a.id_adicional, a.nome, sum(ipa.quantidade), sum(ipa.subtotal)
        from pedidos_validos p
        inner join item_pedido ip on ip.id_pedido = p.id_pedido
        inner join item_pedido_adicional ipa on ipa.id_item_pedido = ip.id_item_pedido
        inner join adicional a on a.id_adicional = ipa.id_adicional
        group by a.id_adicional, a.nome
        order by grupo, quantidade desc, total_vendido desc, nome, id`, limites);

        return rows.map(RelatorioEntity.toMapRanking);
    }
}
