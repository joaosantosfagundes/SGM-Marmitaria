import Entity from "./entity.js";

export default class ProdutoEntity extends Entity {

    #id;
    #nome;
    #descricao;
    #precoPadrao;
    #ativo;
    #criadoEm;

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

    constructor(id, nome, descricao, precoPadrao, ativo, criadoEm) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#descricao = descricao;
        this.#precoPadrao = precoPadrao ?? 0;
        this.#ativo = ativo;
        this.#criadoEm = criadoEm;
    }

    // Mapeia uma linha da tabela `produto` pra Entity
    static toMap(row) {
        return new ProdutoEntity(
            row["id_produto"],
            row["nome"],
            row["descricao"],
            row["preco_padrao"],
            row["ativo"],
            row["criado_em"]
        );
    }

    validar() {
        if (!this.#nome || this.#nome.trim().length < 2) return false;
        if (this.#precoPadrao < 0) return false;
        return true;
    }
}
