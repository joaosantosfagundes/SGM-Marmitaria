import InsumoEntity from "../entities/insumoEntity.js";
import InsumoRepository from "../repositories/insumoRepository.js";

export default class InsumoService {

    #repo;

    constructor() {
        this.#repo = new InsumoRepository();
    }

    async listar() {
        return await this.#repo.listar();
    }

    async listarComDetalhes() {
        return await this.#repo.listarComDetalhes();
    }

    async obter(id) {
        return await this.#repo.obter(id);
    }

    async gravar({ nome, id_categoria, id_unidade, estoque_minimo }) {
        let existente = await this.#repo.obterPorNome(nome);
        if (existente) {
            throw { status: 409, msg: "Já existe um insumo com esse nome" };
        }

        let categoriaOk = await this.#repo.categoriaExiste(id_categoria);
        if (!categoriaOk) {
            throw { status: 400, msg: "Categoria não encontrada ou inativa" };
        }

        let unidadeOk = await this.#repo.unidadeExiste(id_unidade);
        if (!unidadeOk) {
            throw { status: 400, msg: "Unidade não encontrada" };
        }

        // ativo sempre nasce true — não tem como cadastrar já inativo
        let entidade = new InsumoEntity(0, nome, id_categoria, id_unidade, estoque_minimo, true);

        if (!entidade.validar()) {
            throw { status: 400, msg: "Dados inválidos. Confira nome, categoria, unidade e estoque mínimo." };
        }

        await this.#repo.gravar(entidade);
        return entidade;
    }

    async atualizar(id, { nome, id_categoria, id_unidade, estoque_minimo, ativo }) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Insumo não encontrado" };
        }

        if (nome && nome !== atual.nome) {
            let existente = await this.#repo.obterPorNome(nome);
            if (existente) {
                throw { status: 409, msg: "Já existe um insumo com esse nome" };
            }
        }

        if (id_categoria) {
            let categoriaOk = await this.#repo.categoriaExiste(id_categoria);
            if (!categoriaOk) {
                throw { status: 400, msg: "Categoria não encontrada ou inativa" };
            }
        }

        if (id_unidade) {
            let unidadeOk = await this.#repo.unidadeExiste(id_unidade);
            if (!unidadeOk) {
                throw { status: 400, msg: "Unidade não encontrada" };
            }
        }

        atual.nome = nome ?? atual.nome;
        atual.idCategoria = id_categoria ?? atual.idCategoria;
        atual.idUnidade = id_unidade ?? atual.idUnidade;
        atual.estoqueMinimo = estoque_minimo ?? atual.estoqueMinimo;
        atual.ativo = ativo ?? atual.ativo;

        if (!atual.validar()) {
            throw { status: 400, msg: "Dados inválidos. Confira nome, categoria, unidade e estoque mínimo." };
        }

        await this.#repo.atualizar(atual);
        return atual;
    }

    async inativar(id) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Insumo não encontrado" };
        }
        return await this.#repo.inativar(id);
    }

    async excluir(id) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Insumo não encontrado" };
        }

        try {
            return await this.#repo.excluir(id);
        } catch (erro) {
            if (erro?.code === 'ER_ROW_IS_REFERENCED_2' || erro?.code === 'ER_ROW_IS_REFERENCED') {
                throw {
                    status: 409,
                    msg: "Não é possível excluir: esse insumo já tem movimentação de estoque ou está em uso. Use \"Desativar\" em vez disso."
                };
            }
            throw erro;
        }
    }
}
