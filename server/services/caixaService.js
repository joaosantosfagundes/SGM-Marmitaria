import CaixaEntity from "../entities/caixaEntity.js";
import CaixaRepository from "../repositories/caixaRepository.js";

const MENSAGEM_CAIXA_ABERTO = "Já existe um caixa aberto. Feche-o antes de abrir outro.";

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
}
