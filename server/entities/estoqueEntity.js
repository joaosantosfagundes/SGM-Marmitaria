import Entity from "./entity.js";

export default class EstoqueEntity extends Entity {
    #id;
    #nome;
    #categoria;
    #siglaUnidade;
    #quantidade;
    #estoqueMinimo;
    #ativo;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }
    get categoria() { return this.#categoria; }
    set categoria(value) { this.#categoria = value; }
    get siglaUnidade() { return this.#siglaUnidade; }
    set siglaUnidade(value) { this.#siglaUnidade = value; }
    get quantidade() { return this.#quantidade; }
    set quantidade(value) { this.#quantidade = value; }
    get estoqueMinimo() { return this.#estoqueMinimo; }
    set estoqueMinimo(value) { this.#estoqueMinimo = value; }
    get abaixoDoMinimo() { return this.#quantidade < this.#estoqueMinimo; }
    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }

    constructor(id, nome, categoria, siglaUnidade, quantidade, estoqueMinimo, ativo) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#categoria = categoria;
        this.#siglaUnidade = siglaUnidade;
        this.#quantidade = quantidade;
        this.#estoqueMinimo = estoqueMinimo;
        this.#ativo = ativo;
    }

    static toMap(row) {
        return new EstoqueEntity(row.id_insumo, row.nome, row.nome_categoria, row.sigla_unidade,
            Number(row.quantidade ?? 0), Number(row.estoque_minimo), Boolean(row.ativo));
    }

    validar() {
        return Number.isSafeInteger(this.#id) && this.#id > 0
            && Number.isFinite(this.#quantidade) && this.#quantidade >= 0 && this.#quantidade <= 9999999.999
            && Math.round(this.#quantidade * 1000) / 1000 === this.#quantidade
            && Number.isFinite(this.#estoqueMinimo) && this.#estoqueMinimo >= 0;
    }
}
