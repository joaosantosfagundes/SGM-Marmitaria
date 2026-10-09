import Entity from "./entity.js";

export default class AdicionalEntity extends Entity {
    #id;
    #nome;
    #preco;
    #ativo;
    #idInsumo;
    #quantidadeConsumida;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }
    get preco() { return this.#preco; }
    set preco(value) { this.#preco = value; }
    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }
    get idInsumo() { return this.#idInsumo; }
    set idInsumo(value) { this.#idInsumo = value; }
    get quantidadeConsumida() { return this.#quantidadeConsumida; }
    set quantidadeConsumida(value) { this.#quantidadeConsumida = value; }

    constructor(id, nome, preco, ativo, idInsumo, quantidadeConsumida) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#preco = preco;
        this.#ativo = ativo;
        this.#idInsumo = idInsumo ?? null;
        this.#quantidadeConsumida = quantidadeConsumida ?? null;
    }

    static toMap(row) {
        return new AdicionalEntity(row.id_adicional, row.nome, Number(row.preco), Boolean(row.ativo),
            row.id_insumo, row.quantidade_consumida == null ? null : Number(row.quantidade_consumida));
    }

    validar() {
        if (typeof this.#nome !== "string" || !this.#nome.trim() || this.#nome.length > 100) return false;
        if (!Number.isFinite(this.#preco) || this.#preco < 0 || this.#preco > 99999999.99) return false;
        if (Math.abs(this.#preco * 100 - Math.round(this.#preco * 100)) > 0.00001) return false;
        if (typeof this.#ativo !== "boolean") return false;
        if (this.#idInsumo !== null && (!Number.isSafeInteger(this.#idInsumo) || this.#idInsumo <= 0)) return false;
        if (this.#quantidadeConsumida !== null) {
            if (!Number.isFinite(this.#quantidadeConsumida) || this.#quantidadeConsumida <= 0 || this.#quantidadeConsumida > 9999999.999) return false;
            if (Math.abs(this.#quantidadeConsumida * 1000 - Math.round(this.#quantidadeConsumida * 1000)) > 0.00001) return false;
        }
        return true;
    }
}
