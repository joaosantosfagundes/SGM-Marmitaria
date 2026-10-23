import CaixaEntity from "../entities/caixaEntity.js";
import CaixaRepository from "../repositories/caixaRepository.js";
import { centavos, lerInteiro, validarId } from "../utils/pedidoUtils.js";

const MENSAGEM_CAIXA_ABERTO = "Já existe um caixa aberto. Feche-o antes de abrir outro.";
const MENSAGEM_SEM_CAIXA_ABERTO = "Não há caixa aberto para fechar.";

export default class CaixaService {
    #repo;

    constructor() {
        this.#repo = new CaixaRepository();
    }

    async listar() {
        return this.#repo.listar();
    }

    async obterAtual() {
        return this.#repo.obterAtual();
    }

    async obterResumo(id) {
        let resumo = await this.#repo.obterResumo(lerInteiro(id, 'um ID de caixa'));
        if (!resumo) throw { status: 404, msg: "Caixa não encontrado." };
        let valores = [resumo.valorAbertura, resumo.totalDinheiro, resumo.totalPix, resumo.totalDebito, resumo.totalCredito, resumo.totalFiado];
        let totais = valores.map(centavos);
        let [abertura, dinheiro, pix, debito, credito, fiado] = totais;
        let recebido = dinheiro + pix + debito + credito;
        let vendido = recebido + fiado;
        let saldo = abertura + dinheiro;
        if (![...totais, recebido, vendido, saldo].every(Number.isSafeInteger)) {
            throw { status: 409, msg: "Os totais deste caixa ultrapassam o limite de precisão monetária suportado." };
        }
        resumo.totalRecebido = recebido / 100;
        resumo.totalVendido = vendido / 100;
        resumo.saldoEsperadoDinheiro = saldo / 100;
        resumo.diferenca = resumo.status === 'FECHADO' && resumo.valorFechamento !== null
            ? (centavos(resumo.valorFechamento) - saldo) / 100 : null;
        return resumo;
    }

    async abrir(dados, idUsuarioLogado) {
        let entidade = new CaixaEntity(0, idUsuarioLogado, dados?.valorAbertura);
        if (!entidade.validar()) {
            throw { status: 400, msg: "Informe um valor de abertura numérico entre R$ 0,00 e R$ 99.999.999,99, com até duas casas decimais." };
        }
        if (await this.#repo.obterAtual()) throw { status: 409, msg: MENSAGEM_CAIXA_ABERTO };

        try {
            await this.#repo.gravar(entidade);
        } catch (error) {
            // A UNIQUE também protege contra duas aberturas simultâneas.
            if (error?.code === 'ER_DUP_ENTRY' && (error.sqlMessage ?? error.message)?.includes('uq_caixa_um_aberto')) {
                throw { status: 409, msg: MENSAGEM_CAIXA_ABERTO };
            }
            throw error;
        }
        return this.#repo.obter(entidade.id);
    }

    async fechar(dados, idUsuarioLogado) {
        if (!CaixaEntity.validarValor(dados?.valorFechamento)) {
            throw { status: 400, msg: "Informe um valor de fechamento numérico entre R$ 0,00 e R$ 99.999.999,99, com até duas casas decimais." };
        }

        if (dados.idCaixa !== undefined && !validarId(dados.idCaixa)) {
            throw { status: 400, msg: "Informe um ID de caixa válido." };
        }
        // O ID opcional impede fechar outro caixa que tenha sido aberto durante a confirmação na tela.
        let caixa = dados.idCaixa === undefined ? await this.#repo.obterAtual() : await this.#repo.obter(dados.idCaixa);
        if (!caixa || caixa.status !== 'ABERTO') throw { status: 409, msg: MENSAGEM_SEM_CAIXA_ABERTO };

        caixa.idUsuarioFechamento = idUsuarioLogado;
        caixa.valorFechamento = dados.valorFechamento;
        let fechado = await this.#repo.fechar(caixa);
        if (!fechado) throw { status: 409, msg: MENSAGEM_SEM_CAIXA_ABERTO };
        return fechado;
    }
}
