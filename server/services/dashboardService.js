import CaixaService from './caixaService.js';
import EstoqueRepository from '../repositories/estoqueRepository.js';
import FinanceiroRepository from '../repositories/financeiroRepository.js';
import PedidoRepository from '../repositories/pedidoRepository.js';
import RelatorioRepository from '../repositories/relatorioRepository.js';

const DIA_MS = 24 * 60 * 60 * 1000;

export default class DashboardService {
    #caixa = new CaixaService();
    #estoque = new EstoqueRepository();
    #financeiro = new FinanceiroRepository();
    #pedidos = new PedidoRepository();
    #relatorio = new RelatorioRepository();

    async #resumoCaixa() {
        let caixa = await this.#caixa.obterAtual();
        if (!caixa) [caixa] = await this.#caixa.listar();
        if (!caixa) return null;

        let { idCaixa, status, saldoEsperadoDinheiro } = await this.#caixa.obterResumo(String(caixa.id));
        return { idCaixa, status, saldoEsperadoDinheiro };
    }

    async resumo(perfil) {
        let agoraNaOperacao = Date.now() - 3 * 60 * 60 * 1000;
        let hoje = new Date(agoraNaOperacao).toISOString().slice(0, 10);
        if (perfil === 'COZINHA') {
            return { pedidosPorStatus: await this.#pedidos.contarPorStatus({ data: hoje }) };
        }

        let dias = Array.from({ length: 7 }, (_, indice) =>
            new Date(agoraNaOperacao - (6 - indice) * DIA_MS).toISOString().slice(0, 10));
        let limites = [`${dias[0]} 00:00:00`, `${hoje} 23:59:59.999999`];
        let [vendas, despesas, contagemPreparo, caixa, recentes, estoque] = await Promise.all([
            this.#relatorio.vendasPorDia(limites),
            this.#financeiro.despesasPorDia(limites),
            this.#pedidos.contarPorStatus({ status: 'EM_PREPARO' }),
            this.#resumoCaixa(),
            this.#pedidos.listarRecentes(),
            this.#estoque.listar()
        ]);

        let vendasPorDia = new Map(vendas.map(venda => [venda.chave, venda]));
        let despesasPorDia = new Map(despesas.map(despesa => [despesa.data, despesa.valor]));
        let vendasDoDia = vendasPorDia.get(hoje);
        let insumos = estoque.filter(insumo => insumo.abaixoDoMinimo)
            .map(({ id, nome, quantidade, estoqueMinimo, siglaUnidade }) => ({ id, nome, quantidade, estoqueMinimo, siglaUnidade }));

        return {
            data: hoje,
            pedidosHoje: vendasDoDia?.quantidadePedidos ?? 0,
            vendasHoje: vendasDoDia?.totalVendido ?? 0,
            fiadoPendenteHoje: vendasDoDia?.fiadoPendente ?? 0,
            pedidosEmPreparo: contagemPreparo.EM_PREPARO ?? 0,
            caixa,
            movimentacao: dias.map(data => ({
                data, vendas: vendasPorDia.get(data)?.totalVendido ?? 0, despesas: despesasPorDia.get(data) ?? 0
            })),
            pedidosRecentes: recentes.map(({ id, nomeCliente, status, valorTotal }) => ({ id, nomeCliente, status, valorTotal })),
            estoqueAbaixoDoMinimo: { quantidade: insumos.length, insumos }
        };
    }
}
