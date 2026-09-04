import Entity from "./entity.js";

export default class InsumoEntity extends Entity {

    #id;
    #nome;
    #unidadeMedida;
    #quantidade;
    #precoUnitario;
    #fornecedor;

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

    get unidadeMedida() {
        return this.#unidadeMedida;
    }

    set unidadeMedida(value) {
        this.#unidadeMedida = value;
    }

    get quantidade() {
        return this.#quantidade;
    }

    set quantidade(value) {
        this.#quantidade = value;
    }

    get precoUnitario() {
        return this.#precoUnitario;
    }

    set precoUnitario(value) {
        this.#precoUnitario = value;
    }

    get fornecedor() {
        return this.#fornecedor;
    }

    set fornecedor(value) {
        this.#fornecedor = value;
    }

    constructor(id, nome, unidadeMedida, quantidade, precoUnitario, fornecedor) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#unidadeMedida = unidadeMedida;
        this.#quantidade = quantidade;
        this.#precoUnitario = precoUnitario;
        this.#fornecedor = fornecedor;
    }

    static toMap(row) {
        let insumo = new InsumoEntity(
            row["ins_id"],
            row["ins_nome"],
            row["ins_unidade_medida"],
            row["ins_quantidade"],
            row["ins_preco_unitario"],
            row["ins_fornecedor"]
        );

        return insumo;
    }
}