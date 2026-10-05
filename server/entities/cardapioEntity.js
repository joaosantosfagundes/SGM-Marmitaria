import Entity from "./entity.js";

export default class CardapioEntity extends Entity {
    #id;
    #data;
    #preparacoes;

    get id() { return this.#id; }
    get data() { return this.#data; }
    get preparacoes() { return this.#preparacoes; }
    get existe() { return Boolean(this.#id); }

    constructor(id, data, preparacoes) {
        super();
        this.#id = id ?? null;
        this.#data = data;
        this.#preparacoes = preparacoes ?? [];
    }

    static toMap(row, preparacoes = []) {
        return new CardapioEntity(row?.id_cardapio, row?.data_cardapio, preparacoes);
    }
}
