import MovimentacaoEstoqueEntity, { QUANTIDADE_MAXIMA, TIPOS_MOVIMENTACAO } from "../entities/movimentacaoEstoqueEntity.js";
import EstoqueRepository from "../repositories/estoqueRepository.js";

export default class EstoqueService {
    #repo;

    constructor() {
        this.#repo = new EstoqueRepository();
    }

    async listar() {
        return this.#repo.listar();
    }

    async listarMovimentacoes(idInsumo, limite = '50') {
        let filtro;
        if (idInsumo !== undefined) {
            if (typeof idInsumo !== 'string' || !/^\d+$/.test(idInsumo) || !Number.isSafeInteger(Number(idInsumo)) || Number(idInsumo) <= 0) {
                throw { status: 400, msg: "Informe um ID de insumo válido para filtrar o histórico." };
            }
            filtro = Number(idInsumo);
        }
        if (typeof limite !== 'string' || !/^\d+$/.test(limite) || !Number.isSafeInteger(Number(limite)) || Number(limite) < 1 || Number(limite) > 200) {
            throw { status: 400, msg: "O limite do histórico deve ser um número inteiro entre 1 e 200." };
        }
        return this.#repo.listarMovimentacoes(filtro, Number(limite));
    }

    async registrar(dados, idUsuarioLogado) {
        let entidade = new MovimentacaoEstoqueEntity(0, dados?.idInsumo, idUsuarioLogado,
            dados?.tipo, dados?.quantidade, dados?.motivo);
        if (!Number.isSafeInteger(entidade.idInsumo) || entidade.idInsumo <= 0) {
            throw { status: 400, msg: "Informe um insumo válido." };
        }
        if (!TIPOS_MOVIMENTACAO.includes(entidade.tipo)) {
            throw { status: 400, msg: "Informe um tipo de movimentação válido: entrada de compra, perda, ajuste de entrada ou ajuste de saída." };
        }
        if (!MovimentacaoEstoqueEntity.validarQuantidade(entidade.quantidade)) {
            throw { status: 400, msg: "A quantidade deve ser numérica, maior que zero, com até três casas decimais e no máximo 9.999.999,999." };
        }
        if (entidade.motivo !== null && (typeof entidade.motivo !== 'string' || entidade.motivo.length > 255)) {
            throw { status: 400, msg: "O motivo deve ser um texto de até 255 caracteres." };
        }
        if (typeof entidade.motivo === 'string') entidade.motivo = entidade.motivo.trim() || null;
        if (entidade.tipo !== 'ENTRADA_COMPRA' && (!entidade.motivo || entidade.motivo.length < 3)) {
            throw { status: 400, msg: "Informe um motivo com pelo menos 3 caracteres para perdas e ajustes." };
        }
        if (!entidade.validar()) throw { status: 400, msg: "Dados de movimentação inválidos." };

        return this.#repo.registrar(entidade, estoque => {
            if (!estoque) throw { status: 404, msg: "Insumo não encontrado." };
            if (!estoque.ativo) throw { status: 400, msg: "O insumo está inativo. Reative-o antes de registrar uma movimentação." };

            // Calcula em milésimos inteiros para não acumular diferenças de ponto flutuante.
            let entrada = entidade.tipo === 'ENTRADA_COMPRA' || entidade.tipo === 'AJUSTE_ENTRADA';
            let saldoMilesimos = Math.round(estoque.quantidade * 1000);
            let quantidadeMilesimos = Math.round(entidade.quantidade * 1000);
            let novoSaldo = (saldoMilesimos + (entrada ? quantidadeMilesimos : -quantidadeMilesimos)) / 1000;
            if (novoSaldo < 0) {
                let disponivel = estoque.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
                throw { status: 409, msg: `Saldo insuficiente: disponível ${disponivel}.` };
            }
            if (novoSaldo > QUANTIDADE_MAXIMA) {
                throw { status: 409, msg: "O saldo não pode ultrapassar 9.999.999,999 (limite do estoque)." };
            }
            return novoSaldo;
        });
    }
}
