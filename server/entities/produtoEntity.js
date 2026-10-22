import Entity from "./entity.js";

export default class ProdutoEntity extends Entity {

    #id;
    #nome;
    #descricao;
    #precoPadrao;
    #ativo;
    #criadoEm;
    #usaCardapio;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }

    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }

    get descricao() { return this.#descricao; }
    set descricao(value) { this.#descricao = value; }

    get precoPadrao() { return this.#precoPadrao; }
    set precoPadrao(value) { this.#precoPadrao = value; }

    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }

    get criadoEm() { return this.#criadoEm; }
    set criadoEm(value) { this.#criadoEm = value; }
    get usaCardapio() { return this.#usaCardapio; }
    set usaCardapio(value) { this.#usaCardapio = value; }

    constructor(id, nome, descricao, precoPadrao, ativo, criadoEm, usaCardapio = true) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#descricao = descricao;
        this.#precoPadrao = precoPadrao ?? 0;
        this.#ativo = ativo;
        this.#criadoEm = criadoEm;
        this.#usaCardapio = usaCardapio;
    }

    // Mapeia uma linha da tabela `produto` pra Entity
    static toMap(row) {
        return new ProdutoEntity(
            row["id_produto"],
            row["nome"],
            row["descricao"],
            Number(row["preco_padrao"]),
            row["ativo"],
            row["criado_em"],
            Boolean(row["usa_cardapio"])
        );
    }

    validar() {
        if (typeof this.#usaCardapio !== 'boolean') return false;
        if (!this.#nome || this.#nome.trim().length < 2) return false;
        if (!this.#precoPadrao || this.#precoPadrao <= 0) return false;
        return true;
    }
}
