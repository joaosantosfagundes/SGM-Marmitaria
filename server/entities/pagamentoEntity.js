import Entity from "./entity.js";

export default class PagamentoEntity extends Entity {
    #id;
    #forma;
    #status;
    #valor;
    #valorRecebido;
    #dataHora;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get forma() { return this.#forma; }
    set forma(value) { this.#forma = value; }
    get status() { return this.#status; }
    set status(value) { this.#status = value; }
    get valor() { return this.#valor; }
    set valor(value) { this.#valor = value; }
    get valorRecebido() { return this.#valorRecebido; }
    set valorRecebido(value) { this.#valorRecebido = value; }
    get dataHora() { return this.#dataHora; }
    set dataHora(value) { this.#dataHora = value; }

    get troco() {
        return this.#forma === 'DINHEIRO' && this.#valorRecebido !== null
            ? (Math.round(this.#valorRecebido * 100) - Math.round(this.#valor * 100)) / 100 : null;
    }

    constructor({ id = null, forma = null, status = null, valor = null, valorRecebido = null, dataHora = null } = {}) {
        super();
        this.#id = id;
        this.#forma = forma;
        this.#status = status;
        this.#valor = valor;
        this.#valorRecebido = valorRecebido;
        this.#dataHora = dataHora;
    }

    static toMap(row) {
        return new PagamentoEntity({
            id: row.id_pagamento,
            forma: row.forma_pagamento,
            status: row.status,
            valor: Number(row.valor),
            valorRecebido: row.valor_recebido == null ? null : Number(row.valor_recebido),
            dataHora: row.data_hora,
        });
    }

    validar() {
        return ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'FIADO'].includes(this.#forma);
    }
}

