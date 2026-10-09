import Entity from "./entity.js";

export default class CardapioEntity extends Entity {
    #id;
    #data;
    #preparacoes;
    #adicionais;

    get id() { return this.#id; }
    get data() { return this.#data; }
    get preparacoes() { return this.#preparacoes; }
    get adicionais() { return this.#adicionais; }
    get existe() { return Boolean(this.#id); }

    constructor(id, data, preparacoes, adicionais) {
        super();
        this.#id = id ?? null;
        this.#data = data;
        this.#preparacoes = preparacoes ?? [];
        this.#adicionais = adicionais ?? [];
    }

    static toMap(row, preparacoes = [], adicionais = []) {
        return new CardapioEntity(row?.id_cardapio, row?.data_cardapio, preparacoes, adicionais);
    }
}
