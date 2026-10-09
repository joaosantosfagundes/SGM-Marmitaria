import AdicionalEntity from "../entities/adicionalEntity.js";
import AdicionalRepository from "../repositories/adicionalRepository.js";
import InsumoRepository from "../repositories/insumoRepository.js";

export default class AdicionalService {
    #repo;
    #insumoRepo;

    constructor() {
        this.#repo = new AdicionalRepository();
        this.#insumoRepo = new InsumoRepository();
    }

    async listar() {
        return this.#repo.listar();
    }

    async obter(id) {
        let atual = await this.#repo.obter(id);
        if (!atual) throw { status: 404, msg: "Adicional não encontrado." };
        return atual;
    }

    async gravar({ nome, preco, id_insumo, quantidade_consumida } = {}) {
        let entidade = new AdicionalEntity(0, nome, preco, true, id_insumo, quantidade_consumida);
        await this.#validar(entidade);
        await this.#repo.gravar(entidade);
        return entidade;
    }

    async atualizar(id, dados = {}) {
        let atual = await this.obter(id);
        if (dados.nome !== undefined) atual.nome = dados.nome;
        if (dados.preco !== undefined) atual.preco = dados.preco;
        if (dados.ativo !== undefined) atual.ativo = dados.ativo;
        if (dados.id_insumo !== undefined) atual.idInsumo = dados.id_insumo;
        if (dados.quantidade_consumida !== undefined) atual.quantidadeConsumida = dados.quantidade_consumida;
        await this.#validar(atual);
        await this.#repo.atualizar(atual);
        return atual;
    }

    async #validar(entidade) {
        if (typeof entidade.nome === "string") entidade.nome = entidade.nome.trim().replace(/\s+/g, " ");
        if (!entidade.validar()) {
            throw { status: 400, msg: "Informe nome com até 100 caracteres, preço maior ou igual a zero (até duas casas decimais) e, se preenchidos, insumo e quantidade válidos (até três casas decimais)." };
        }
        if (entidade.ativo && await this.#repo.obterAtivoPorNome(entidade.nome, entidade.id)) {
            throw { status: 409, msg: "Já existe um adicional ativo com esse nome." };
        }
        if (entidade.idInsumo !== null && !(await this.#insumoRepo.obter(entidade.idInsumo))) {
            throw { status: 400, msg: "O insumo informado não existe." };
        }
    }

    async inativar(id) {
        await this.obter(id);
        return this.#repo.inativar(id);
    }

    async excluir(id) {
        await this.obter(id);
        try {
            return await this.#repo.excluir(id);
        } catch (error) {
            if (error?.code === "ER_ROW_IS_REFERENCED_2" || error?.code === "ER_ROW_IS_REFERENCED") {
                throw { status: 409, msg: "Não é possível excluir: esse adicional já foi usado em pedidos ou no cardápio. Use Desativar para preservar o histórico." };
            }
            throw error;
        }
    }
}
