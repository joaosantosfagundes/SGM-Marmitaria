import Entity from "./entity.js";

export default class AdicionalEntity extends Entity {
    #id;
    #nome;
    #preco;
    #ativo;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }
    get preco() { return this.#preco; }
    set preco(value) { this.#preco = value; }
    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }

    constructor(id, nome, preco, ativo) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#preco = preco;
        this.#ativo = ativo;
    }

    static toMap(row) {
        return new AdicionalEntity(row.id_adicional, row.nome, Number(row.preco), Boolean(row.ativo));
    }

    static validarPreco(preco) {
        return Number.isFinite(preco) && preco >= 0.01 && preco <= 99999999.99
            && Math.round(preco * 100) / 100 === preco;
    }

    validar() {
        if (typeof this.#nome !== "string" || !this.#nome.trim() || this.#nome.length > 100) return false;
        if (!AdicionalEntity.validarPreco(this.#preco)) return false;
        if (typeof this.#ativo !== "boolean") return false;
        return true;
    }
}
