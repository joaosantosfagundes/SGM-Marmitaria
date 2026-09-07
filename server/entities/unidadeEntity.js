import Entity from "./entity.js";

export default class UnidadeEntity extends Entity {

    #id;
    #nome;
    #sigla;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }

    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }

    get sigla() { return this.#sigla; }
    set sigla(value) { this.#sigla = value; }

    constructor(id, nome, sigla) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#sigla = sigla;
    }

    static toMap(row) {
        return new UnidadeEntity(row["id_unidade"], row["nome"], row["sigla"]);
    }
}
