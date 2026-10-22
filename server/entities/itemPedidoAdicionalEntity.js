import Entity from "./entity.js";

export default class ItemPedidoAdicionalEntity extends Entity {
    #id;
    #idAdicional;
    #nomeAdicional;
    #quantidade;
    #precoUnitario;
    #subtotal;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get idAdicional() { return this.#idAdicional; }
    set idAdicional(value) { this.#idAdicional = value; }
    get nomeAdicional() { return this.#nomeAdicional; }
    set nomeAdicional(value) { this.#nomeAdicional = value; }
    get quantidade() { return this.#quantidade; }
    set quantidade(value) { this.#quantidade = value; }
    get precoUnitario() { return this.#precoUnitario; }
    set precoUnitario(value) { this.#precoUnitario = value; }
    get subtotal() { return this.#subtotal; }
    set subtotal(value) { this.#subtotal = value; }

    constructor({ id = null, idAdicional = null, nomeAdicional = null, quantidade = null, precoUnitario = null, subtotal = null } = {}) {
        super();
        this.#id = id;
        this.#idAdicional = idAdicional;
        this.#nomeAdicional = nomeAdicional;
        this.#quantidade = quantidade;
        this.#precoUnitario = precoUnitario;
        this.#subtotal = subtotal;
    }

    static toMap(row) {
        return new ItemPedidoAdicionalEntity({
            id: row.id_item_pedido_adicional,
            idAdicional: row.id_adicional,
            nomeAdicional: row.nome_adicional,
            quantidade: row.quantidade,
            precoUnitario: Number(row.preco_unitario),
            subtotal: Number(row.subtotal),
        });
    }

    validar() {
        return Number.isSafeInteger(this.#idAdicional) && this.#idAdicional > 0 && Number.isInteger(this.#quantidade) && this.#quantidade > 0 && this.#quantidade <= 2147483647;
    }
}

