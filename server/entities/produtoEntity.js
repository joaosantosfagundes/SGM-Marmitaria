import Entity from "./entity.js";

export default class ProdutoEntity extends Entity {

    #id;
    #nome;
    #descricao;
    #preco;
    #quantidadeEstoque;
    #categoria;

    get id() {
        return this.#id;
    }

    set id(value) {
        this.#id = value;
    }

    get nome() {
        return this.#nome;
    }

    set nome(value) {
        this.#nome = value;
    }

    get descricao() {
        return this.#descricao;
    }

    set descricao(value) {
        this.#descricao = value;
    }

    get preco() {
        return this.#preco;
    }

    set preco(value) {
        this.#preco = value;
    }

    get quantidadeEstoque() {
        return this.#quantidadeEstoque;
    }

    set quantidadeEstoque(value) {
        this.#quantidadeEstoque = value;
    }

    get categoria() {
        return this.#categoria;
    }

    set categoria(value) {
        this.#categoria = value;
    }

    constructor(id, nome, descricao, preco, quantidadeEstoque, categoria) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#descricao = descricao;
        this.#preco = preco;
        this.#quantidadeEstoque = quantidadeEstoque;
        this.#categoria = categoria;
    }

    static toMap(row) {
        let produto = new ProdutoEntity(
            row["prd_id"],
            row["prd_nome"],
            row["prd_descricao"],
            row["prd_preco"],
            row["prd_quantidade_estoque"],
            row["prd_categoria"]
        );

        return produto;
    }
}