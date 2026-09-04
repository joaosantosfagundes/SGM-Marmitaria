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

    async gravar({ nome, id_categoria, id_unidade, classificacao, preco_custo, preco_venda, estoque_minimo }) {
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
        let entidade = new InsumoEntity(
            0, nome, id_categoria, id_unidade, classificacao,
            preco_custo, preco_venda, estoque_minimo, true
        );

        if (!entidade.validar()) {
            throw { status: 400, msg: "Dados inválidos. Confira nome, categoria, unidade e classificação." };
        }

        await this.#repo.gravar(entidade);
        return entidade;
    }

    async atualizar(id, { nome, id_categoria, id_unidade, classificacao, preco_custo, preco_venda, estoque_minimo, ativo }) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Insumo não encontrado" };
        }

        // se o nome mudou, confere que o novo nome não colide com outro insumo
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
        atual.classificacao = classificacao ?? atual.classificacao;
        atual.precoCusto = preco_custo ?? atual.precoCusto;
        atual.precoVenda = preco_venda ?? atual.precoVenda;
        atual.estoqueMinimo = estoque_minimo ?? atual.estoqueMinimo;
        atual.ativo = ativo ?? atual.ativo;

        if (!atual.validar()) {
            throw { status: 400, msg: "Dados inválidos. Confira nome, categoria, unidade e classificação." };
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
}