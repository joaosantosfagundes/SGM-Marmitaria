import EstoqueEntity from './estoqueEntity.js';

export default class RelatorioEntity {
    static toMapVendas(row) {
        return {
            grupo: row.grupo,
            chave: row.chave,
            quantidadePedidos: Number(row.quantidade_pedidos),
            quantidadeVendidos: Number(row.quantidade_vendidos),
            quantidadeCancelados: Number(row.quantidade_cancelados),
            totalVendido: Number(row.total_vendido),
            totalCancelado: Number(row.total_cancelado),
            fiadoPendente: Number(row.fiado_pendente),
            ticketMedio: Number(row.ticket_medio)
        };
    }

    static toMapEstoque(row) {
        return {
            insumo: EstoqueEntity.toMap(row),
            entradas: Number(row.entradas),
            perdas: Number(row.perdas),
            ajustesEntrada: Number(row.ajustes_entrada),
            ajustesSaida: Number(row.ajustes_saida)
        };
    }

    static toMapRanking(row) {
        return {
            grupo: row.grupo,
            id: row.id,
            nome: row.nome,
            quantidade: Number(row.quantidade),
            totalVendido: Number(row.total_vendido)
        };
    }

    static toMapFiado(row) {
        return {
            idCliente: row.id_cliente,
            nome: row.nome,
            totalEmAberto: Number(row.total_em_aberto),
            quantidadePendentes: Number(row.quantidade_pendentes),
            fiadoMaisAntigo: row.fiado_mais_antigo,
            totalQuitadoNoPeriodo: Number(row.total_quitado),
            pedido: {
                idPagamento: row.id_pagamento,
                idPedido: row.id_pedido,
                status: row.status,
                dataHora: row.data_hora,
                valor: Number(row.valor),
                dataQuitacao: row.data_quitacao,
                formaQuitacao: row.forma_quitacao
            }
        };
    }
}
