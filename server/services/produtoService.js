import ProdutoEntity from "../entities/produtoEntity.js";
import ProdutoRepository from "../repositories/produtoRepository.js";

export default class ProdutoService {

    #repo;

    constructor() {
        this.#repo = new ProdutoRepository();
    }

    async listar() {
        return await this.#repo.listar();
    }

    async obter(id) {
        return await this.#repo.obter(id);
    }

    async gravar({ nome, descricao, preco_padrao }) {
        let existente = await this.#repo.obterPorNome(nome);
        if (existente) {
            throw { status: 409, msg: "Já existe um produto com esse nome" };
        }

        // ativo sempre nasce true — não tem como cadastrar já inativo
        let entidade = new ProdutoEntity(0, nome, descricao, preco_padrao, true);

        if (!entidade.validar()) {
            throw { status: 400, msg: "Dados inválidos. Confira nome e preço." };
        }

        await this.#repo.gravar(entidade);
        return entidade;
    }

    async atualizar(id, { nome, descricao, preco_padrao, ativo }) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Produto não encontrado" };
        }

        if (nome && nome !== atual.nome) {
            let existente = await this.#repo.obterPorNome(nome);
            if (existente) {
                throw { status: 409, msg: "Já existe um produto com esse nome" };
            }
        }

        atual.nome = nome ?? atual.nome;
        atual.descricao = descricao ?? atual.descricao;
        atual.precoPadrao = preco_padrao ?? atual.precoPadrao;
        atual.ativo = ativo ?? atual.ativo;

        if (!atual.validar()) {
            throw { status: 400, msg: "Dados inválidos. Confira nome e preço." };
        }

        await this.#repo.atualizar(atual);
        return atual;
    }

    async inativar(id) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Produto não encontrado" };
        }
        return await this.#repo.inativar(id);
    }

    async excluir(id) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Produto não encontrado" };
        }

        try {
            return await this.#repo.excluir(id);
        } catch (erro) {
            // Já tem pedido/cardápio usando esse produto — o MySQL recusa a exclusão
            // (é a própria FK protegendo o histórico). Traduz pra mensagem legível.
            if (erro?.code === 'ER_ROW_IS_REFERENCED_2' || erro?.code === 'ER_ROW_IS_REFERENCED') {
                throw {
                    status: 409,
                    msg: "Não é possível excluir: esse produto já foi usado em pedidos ou no cardápio. Use \"Desativar\" em vez disso."
                };
            }
            throw erro;
        }
    }
}