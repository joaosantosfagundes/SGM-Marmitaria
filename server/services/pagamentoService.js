import PagamentoRepository from '../repositories/pagamentoRepository.js';
import CaixaRepository from '../repositories/caixaRepository.js';
import { centavos, lerInteiro, validarDinheiro } from '../utils/pedidoUtils.js';
import { validarData } from './cardapioService.js';

const FORMAS = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'];

export default class PagamentoService {
    #repo = new PagamentoRepository();
    #caixaRepo = new CaixaRepository();

    async listar({ data, forma, status, idCaixa, limite = '200' } = {}) {
        if (data !== undefined && !validarData(data)) throw { status: 400, msg: 'Informe uma data válida (AAAA-MM-DD).' };
        if (forma !== undefined && ![...FORMAS, 'FIADO'].includes(forma)) throw { status: 400, msg: 'Informe uma forma de pagamento válida.' };
        if (status !== undefined && !['PAGO', 'PENDENTE', 'CANCELADO'].includes(status)) throw { status: 400, msg: 'Informe um status de pagamento válido.' };
        return this.#repo.listar({ data, forma, status,
            idCaixa: idCaixa === undefined ? undefined : lerInteiro(idCaixa, 'um ID de caixa'),
            limite: lerInteiro(limite, 'um limite entre 1 e 200', 200) });
    }

    async listarFiado() {
        let pagamentos = await this.#repo.listarFiado(), clientes = new Map();
        for (let pagamento of pagamentos) {
            if (!clientes.has(pagamento.idCliente)) clientes.set(pagamento.idCliente, {
                idCliente: pagamento.idCliente, nome: pagamento.nomeCliente, telefone: pagamento.telefoneCliente,
                quantidade: 0, totalEmAberto: 0, pedidos: [],
            });
            let cliente = clientes.get(pagamento.idCliente);
            let total = centavos(cliente.totalEmAberto) + centavos(pagamento.valor);
            if (!Number.isSafeInteger(total)) throw { status: 409, msg: 'O total em aberto ultrapassa a precisão monetária suportada.' };
            cliente.totalEmAberto = total / 100;
            cliente.quantidade++;
            cliente.pedidos.push(pagamento);
        }
        return [...clientes.values()];
    }

    async quitar(id, dados, idUsuario) {
        return this.#quitar({ id: lerInteiro(id, 'um ID de pagamento') }, dados, idUsuario);
    }

    async quitarCliente(idCliente, dados, idUsuario) {
        return this.#quitar({ idCliente: lerInteiro(idCliente, 'um ID de cliente') }, dados, idUsuario);
    }

    async #quitar(alvo, dados, idUsuario) {
        if (!FORMAS.includes(dados?.forma)) throw { status: 400, msg: 'Escolha DINHEIRO, PIX, DEBITO ou CREDITO para quitar.' };
        let recebido = dados.valorRecebido ?? null;
        if (dados.forma !== 'DINHEIRO' && dados.valorRecebido !== undefined) throw { status: 400, msg: 'Valor recebido só é permitido em DINHEIRO.' };
        if (recebido !== null && !validarDinheiro(recebido)) throw { status: 400, msg: 'Informe um valor recebido numérico, com até duas casas decimais e no máximo R$ 99.999.999,99.' };
        return this.#repo.quitar(alvo, async (pagamentos, pedidos, consultar) => {
            if (!pagamentos.length) throw { status: alvo.id === undefined ? 409 : 404, msg: alvo.id === undefined ? 'Não há fiados pendentes para quitar deste cliente.' : 'Pagamento não encontrado.' };
            if (pagamentos.some(pg => pg.forma !== 'FIADO' || pg.status !== 'PENDENTE'
                || !pedidos.some(p => p.id_pedido === pg.idPedido && p.status !== 'CANCELADO' && (alvo.idCliente === undefined || p.id_cliente === alvo.idCliente)))) {
                throw { status: 409, msg: 'Só é possível quitar fiado pendente de pedido não cancelado. Atualize a lista.' };
            }
            let total = pagamentos.reduce((soma, pg) => soma + centavos(pg.valor), 0);
            if (!Number.isSafeInteger(total)) throw { status: 409, msg: 'O total da quitação ultrapassa a precisão monetária suportada.' };
            if (recebido !== null && centavos(recebido) < total) throw { status: 400, msg: 'O valor recebido é menor que o total da quitação.' };
            let caixa = await this.#caixaRepo.obterAtual(consultar);
            if (!caixa) throw { status: 409, msg: 'Abra o caixa antes de quitar fiados.' };
            let troco = recebido === null ? null : (centavos(recebido) - total) / 100;
            // No lote, o troco fica no último pagamento, sem repetir o valor entregue pelo cliente.
            let valoresRecebidos = pagamentos.map((pg, indice) => recebido === null ? null
                : (centavos(pg.valor) + (indice === pagamentos.length - 1 ? centavos(troco) : 0)) / 100);
            return { idUsuario, forma: dados.forma, idCaixaQuitacao: caixa.id, total: total / 100,
                valorRecebido: recebido, troco, valoresRecebidos,
                conferirAtualizacao(linhas) {
                    if (linhas !== 1) throw { status: 409, msg: 'O pagamento foi alterado por outra pessoa. Atualize a lista.' };
                } };
        });
    }
}
