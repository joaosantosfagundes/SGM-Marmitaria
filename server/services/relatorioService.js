import RelatorioRepository from '../repositories/relatorioRepository.js';
import { validarData } from './cardapioService.js';

export default class RelatorioService {
    #repo = new RelatorioRepository();

    #periodo({ dataInicio, dataFim } = {}) {
        let hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
        dataInicio ??= dataFim ?? hoje;
        dataFim ??= dataInicio;

        if (!validarData(dataInicio) || !validarData(dataFim) || dataInicio < '1000-01-01' || dataFim < '1000-01-01') {
            throw { status: 400, msg: 'Informe datas válidas para o período (AAAA-MM-DD).' };
        }
        if (dataInicio > dataFim) {
            throw { status: 400, msg: 'A data inicial não pode ser posterior à data final.' };
        }

        return {
            periodo: { dataInicio, dataFim },
            limites: [`${dataInicio} 00:00:00`, `${dataFim} 23:59:59.999999`]
        };
    }

    async vendas(filtros) {
        let { periodo, limites } = this.#periodo(filtros);
        let resultado = { periodo, resumo: null, porDia: [], porFormaPagamento: [], porTipoAtendimento: [], porStatus: [] };

        for (let { grupo, chave, ...totais } of await this.#repo.vendas(limites)) {
            if (grupo === 'resumo') resultado.resumo = totais;
            else resultado[grupo].push({ chave, ...totais });
        }

        return resultado;
    }

    async estoque(filtros) {
        let { periodo, limites } = this.#periodo(filtros);
        return { periodo, insumos: await this.#repo.estoque(limites) };
    }

    async produtosMaisVendidos(filtros) {
        let { periodo, limites } = this.#periodo(filtros);
        let resultado = { periodo, produtos: [], adicionais: [] };

        for (let { grupo, ...item } of await this.#repo.produtosMaisVendidos(limites)) {
            resultado[grupo].push(item);
        }

        return resultado;
    }
}
