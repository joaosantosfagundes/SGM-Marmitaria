import Entity from "./entity.js";

export default class InsumoEntity extends Entity {

    #id;
    #nome;
    #idCategoria;
    #idUnidade;
    #estoqueMinimo;
    #ativo;
    #criadoEm;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }

    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }

    get idCategoria() { return this.#idCategoria; }
    set idCategoria(value) { this.#idCategoria = value; }

    get idUnidade() { return this.#idUnidade; }
    set idUnidade(value) { this.#idUnidade = value; }

    get estoqueMinimo() { return this.#estoqueMinimo; }
    set estoqueMinimo(value) { this.#estoqueMinimo = value; }

    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }

    get criadoEm() { return this.#criadoEm; }
    set criadoEm(value) { this.#criadoEm = value; }

    constructor(id, nome, idCategoria, idUnidade, estoqueMinimo, ativo, criadoEm) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#idCategoria = idCategoria;
        this.#idUnidade = idUnidade;
        this.#estoqueMinimo = estoqueMinimo ?? 0;
        this.#ativo = ativo;
        this.#criadoEm = criadoEm;
    }

    static toMap(row) {
        return new InsumoEntity(
            row["id_insumo"],
            row["nome"],
            row["id_categoria"],
            row["id_unidade"],
            Number(row["estoque_minimo"]),
            row["ativo"],
            row["criado_em"]
        );
    }

    validar() {
        if (!this.#nome || this.#nome.trim().length < 2) return false;
        if (!this.#idCategoria) return false;
        if (!this.#idUnidade) return false;
        if (this.#estoqueMinimo < 0) return false;

        return true;
    }
}
