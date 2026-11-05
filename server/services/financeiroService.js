import FinanceiroRepository from '../repositories/financeiroRepository.js';
import MovimentacaoFinanceiraEntity from '../entities/movimentacaoFinanceiraEntity.js';
import { validarData } from './cardapioService.js';
import { centavos, lerInteiro } from '../utils/pedidoUtils.js';

export default class FinanceiroService {
    #repo = new FinanceiroRepository();

    async listar({ dataInicio, dataFim, tipo, categoria } = {}) {
        if ((dataInicio !== undefined && !validarData(dataInicio)) || (dataFim !== undefined && !validarData(dataFim))) throw { status: 400, msg: 'Informe datas válidas para o período (AAAA-MM-DD).' };
        if (dataInicio && dataFim && dataInicio > dataFim) throw { status: 400, msg: 'A data inicial não pode ser posterior à data final.' };
        if (tipo !== undefined && !['ENTRADA', 'SAIDA'].includes(tipo)) throw { status: 400, msg: 'Informe o tipo ENTRADA ou SAIDA.' };
        if (categoria !== undefined && (typeof categoria !== 'string' || !categoria.trim() || categoria.length > 100)) throw { status: 400, msg: 'Informe uma categoria com até 100 caracteres.' };
        let movimentacoes = await this.#repo.listar({ dataInicio, dataFim, tipo, categoria: categoria?.trim() });
        let entradas = 0, saidas = 0, recebimentosCaixas = 0, entradasAvulsas = 0;
        for (let movimentacao of movimentacoes) {
            let valor = centavos(movimentacao.valor);
            if (movimentacao.tipo === 'ENTRADA') {
                entradas += valor;
                if (movimentacao.origem === 'CAIXA') recebimentosCaixas += valor;
                else entradasAvulsas += valor;
            } else saidas += valor;
        }
        if (![entradas, saidas, entradas - saidas, recebimentosCaixas, entradasAvulsas].every(Number.isSafeInteger)) throw { status: 409, msg: 'Os totais ultrapassam a precisão monetária suportada.' };
        return { movimentacoes, totais: { entradas: entradas / 100, saidas: saidas / 100, saldo: (entradas - saidas) / 100,
            recebimentosCaixas: recebimentosCaixas / 100, entradasAvulsas: entradasAvulsas / 100 } };
    }

    #preparar(dados, idUsuario) {
        if (!dados || typeof dados !== 'object') throw { status: 400, msg: 'Informe os dados do lançamento.' };
        if (dados.idCaixa != null || dados.id_caixa != null || dados.idPedido != null || dados.idPagamento != null || dados.idMovimentacaoEstoque != null || dados.id_pedido != null || dados.id_pagamento != null || dados.id_movimentacao_estoque != null) throw { status: 400, msg: 'Vínculos com caixa, pedido, pagamento ou estoque não podem ser informados por esta tela.' };
        let dataHora = MovimentacaoFinanceiraEntity.normalizarDataHora(dados.dataHora);
        if (!dataHora) throw { status: 400, msg: 'Informe uma data e hora reais para o lançamento, sem conversão para UTC.' };
        if (!MovimentacaoFinanceiraEntity.validarValor(dados.valor)) throw { status: 400, msg: 'O valor deve ser numérico, maior que zero, com até duas casas decimais e no máximo R$ 99.999.999,99.' };
        let entidade = new MovimentacaoFinanceiraEntity({ ...dados, id: null, idUsuario, dataHora, idCaixa: null });
        if (!entidade.validar()) throw { status: 400, msg: 'Informe ENTRADA ou SAIDA, categoria de até 100 caracteres, descrição de até 255 e recorrência válida: booleano e, se recorrente, quantidade de meses inteira de 2 a 2147483647; caso contrário, meses deve ser null.' };
        return entidade;
    }

    #validarManual(atual) {
        if (!atual) throw { status: 404, msg: 'Lançamento financeiro não encontrado.' };
        if (atual.idMovimentacaoEstoque !== null || atual.idPedido !== null) throw { status: 409, msg: 'Somente lançamentos manuais podem ser editados ou excluídos. Este lançamento possui vínculo com estoque ou pedido.' };
    }

    async criar(dados, idUsuario) { return this.#repo.criar(this.#preparar(dados, idUsuario)); }

    async atualizar(id, dados) {
        id = lerInteiro(id, 'um ID de lançamento');
        let atualizado = await this.#repo.atualizar(id, atual => {
            this.#validarManual(atual);
            return this.#preparar({ ...atual.toJSON(), ...dados }, atual.idUsuario);
        });
        if (!atualizado) throw { status: 409, msg: 'O lançamento foi alterado. Atualize a lista.' };
        return atualizado;
    }

    async excluir(id) {
        let excluido = await this.#repo.excluir(lerInteiro(id, 'um ID de lançamento'), atual => this.#validarManual(atual));
        if (!excluido) throw { status: 409, msg: 'O lançamento foi alterado. Atualize a lista.' };
        return { msg: 'Lançamento excluído.' };
    }
}
