import RelatorioRepository from '../repositories/relatorioRepository.js';
import FinanceiroRepository from '../repositories/financeiroRepository.js';
import { centavos } from '../utils/pedidoUtils.js';
import { validarData } from './cardapioService.js';
import { calcularTotaisFinanceiro } from './financeiroService.js';

export default class RelatorioService {
    #repo = new RelatorioRepository();
    #financeiro = new FinanceiroRepository();

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

    async financeiro(filtros) {
        let { periodo } = this.#periodo(filtros);
        let porCategoria = [], porFormaPagamento = [];
        let entradas = 0, saidas = 0, recebimentosCaixas = 0, fiadoAReceber = 0;

        for (let { grupo, chave, tipo, valor } of await this.#financeiro.resumir(periodo)) {
            if (grupo === 'categoria') {
                porCategoria.push({ categoria: chave, tipo, valor });
                if (tipo === 'ENTRADA') entradas += centavos(valor);
                else saidas += centavos(valor);
            } else if (grupo === 'forma') {
                porFormaPagamento.push({ forma: chave, valor });
                recebimentosCaixas += centavos(valor);
            } else {
                fiadoAReceber = valor;
            }
        }

        return { periodo, totais: calcularTotaisFinanceiro(entradas, saidas, recebimentosCaixas),
            porCategoria, porFormaPagamento, fiadoAReceber };
    }

    async fiado(filtros) {
        let { periodo, limites } = this.#periodo(filtros);
        let clientes = new Map();
        for (let { pedido, ...resumo } of await this.#repo.fiado(limites)) {
            let cliente = clientes.get(resumo.idCliente);
            if (!cliente) {
                cliente = { ...resumo, pendentes: [], quitados: [] };
                clientes.set(cliente.idCliente, cliente);
            }
            if (pedido.status === 'PENDENTE') cliente.pendentes.push(pedido);
            else cliente.quitados.push(pedido);
        }

        return { periodo, clientes: [...clientes.values()] };
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
