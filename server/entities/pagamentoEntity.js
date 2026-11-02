import Entity from "./entity.js";

export default class PagamentoEntity extends Entity {
    #id;
    #forma;
    #status;
    #valor;
    #valorRecebido;
    #dataHora;
    #idPedido;
    #idCliente;
    #nomeCliente;
    #telefoneCliente;
    #statusPedido;
    #idCaixa;
    #idUsuarioQuitacao;
    #nomeUsuarioQuitacao;
    #dataQuitacao;
    #formaQuitacao;
    #idCaixaQuitacao;

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
    get idPedido() { return this.#idPedido; }
    get idCliente() { return this.#idCliente; }
    get nomeCliente() { return this.#nomeCliente; }
    get telefoneCliente() { return this.#telefoneCliente; }
    get statusPedido() { return this.#statusPedido; }
    get idCaixa() { return this.#idCaixa; }
    get idUsuarioQuitacao() { return this.#idUsuarioQuitacao; }
    get nomeUsuarioQuitacao() { return this.#nomeUsuarioQuitacao; }
    get dataQuitacao() { return this.#dataQuitacao; }
    get formaQuitacao() { return this.#formaQuitacao; }
    get idCaixaQuitacao() { return this.#idCaixaQuitacao; }

    get troco() {
        let dinheiro = this.#forma === 'DINHEIRO' || (this.#forma === 'FIADO' && this.#formaQuitacao === 'DINHEIRO');
        return dinheiro && this.#valorRecebido !== null
            ? (Math.round(this.#valorRecebido * 100) - Math.round(this.#valor * 100)) / 100 : null;
    }

    constructor({ id = null, forma = null, status = null, valor = null, valorRecebido = null, dataHora = null,
        idPedido = null, idCliente = null, nomeCliente = null, telefoneCliente = null, statusPedido = null,
        idCaixa = null, idUsuarioQuitacao = null, nomeUsuarioQuitacao = null, dataQuitacao = null,
        formaQuitacao = null, idCaixaQuitacao = null } = {}) {
        super();
        this.#id = id;
        this.#forma = forma;
        this.#status = status;
        this.#valor = valor;
        this.#valorRecebido = valorRecebido;
        this.#dataHora = dataHora;
        this.#idPedido = idPedido;
        this.#idCliente = idCliente;
        this.#nomeCliente = nomeCliente;
        this.#telefoneCliente = telefoneCliente;
        this.#statusPedido = statusPedido;
        this.#idCaixa = idCaixa;
        this.#idUsuarioQuitacao = idUsuarioQuitacao;
        this.#nomeUsuarioQuitacao = nomeUsuarioQuitacao;
        this.#dataQuitacao = dataQuitacao;
        this.#formaQuitacao = formaQuitacao;
        this.#idCaixaQuitacao = idCaixaQuitacao;
    }

    static toMap(row) {
        return new PagamentoEntity({
            id: row.id_pagamento,
            forma: row.forma_pagamento,
            status: row.status,
            valor: Number(row.valor),
            valorRecebido: row.valor_recebido == null ? null : Number(row.valor_recebido),
            dataHora: row.data_hora,
            idPedido: row.id_pedido,
            idCliente: row.id_cliente,
            nomeCliente: row.nome_cliente,
            telefoneCliente: row.telefone_cliente,
            statusPedido: row.status_pedido,
            idCaixa: row.id_caixa,
            idUsuarioQuitacao: row.id_usuario_quitacao,
            nomeUsuarioQuitacao: row.nome_usuario_quitacao,
            dataQuitacao: row.data_quitacao,
            formaQuitacao: row.forma_quitacao,
            idCaixaQuitacao: row.id_caixa_quitacao,
        });
    }

    validar() {
        return ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'FIADO'].includes(this.#forma);
    }
}

