import Entity from "./entity.js";

export default class CategoriaEntity extends Entity {

    #id;
    #nome;
    #descricao;
    #ativo;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }

    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }

    get descricao() { return this.#descricao; }
    set descricao(value) { this.#descricao = value; }

    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }

    constructor(id, nome, descricao, ativo) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#descricao = descricao;
        this.#ativo = ativo;
    }

    static toMap(row) {
        return new CategoriaEntity(row["id_categoria"], row["nome"], row["descricao"], row["ativo"]);
    }
}
