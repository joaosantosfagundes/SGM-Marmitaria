import Entity from "./entity.js";

export default class PedidoEntity extends Entity {
    #id;
    #idCaixa;
    #idUsuario;
    #nomeUsuario;
    #idCliente;
    #nomeCliente;
    #dataHora;
    #status;
    #tipoAtendimento;
    #enderecoEntrega;
    #observacao;
    #valorTotal;
    #itens;
    #pagamento;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get idCaixa() { return this.#idCaixa; }
    set idCaixa(value) { this.#idCaixa = value; }
    get idUsuario() { return this.#idUsuario; }
    set idUsuario(value) { this.#idUsuario = value; }
    get nomeUsuario() { return this.#nomeUsuario; }
    set nomeUsuario(value) { this.#nomeUsuario = value; }
    get idCliente() { return this.#idCliente; }
    set idCliente(value) { this.#idCliente = value; }
    get nomeCliente() { return this.#nomeCliente; }
    set nomeCliente(value) { this.#nomeCliente = value; }
    get dataHora() { return this.#dataHora; }
    set dataHora(value) { this.#dataHora = value; }
    get status() { return this.#status; }
    set status(value) { this.#status = value; }
    get tipoAtendimento() { return this.#tipoAtendimento; }
    set tipoAtendimento(value) { this.#tipoAtendimento = value; }
    get enderecoEntrega() { return this.#enderecoEntrega; }
    set enderecoEntrega(value) { this.#enderecoEntrega = value; }
    get observacao() { return this.#observacao; }
    set observacao(value) { this.#observacao = value; }
    get valorTotal() { return this.#valorTotal; }
    set valorTotal(value) { this.#valorTotal = value; }
    get itens() { return this.#itens; }
    set itens(value) { this.#itens = value; }
    get pagamento() { return this.#pagamento; }
    set pagamento(value) { this.#pagamento = value; }

    constructor({
        id = null, idCaixa = null, idUsuario = null, nomeUsuario = null,
        idCliente = null, nomeCliente = null, dataHora = null, status = 'RECEBIDO',
        tipoAtendimento = null, enderecoEntrega = null, observacao = null,
        valorTotal = null, itens = [], pagamento = null,
    } = {}) {
        super();
        this.#id = id;
        this.#idCaixa = idCaixa;
        this.#idUsuario = idUsuario;
        this.#nomeUsuario = nomeUsuario;
        this.#idCliente = idCliente;
        this.#nomeCliente = nomeCliente;
        this.#dataHora = dataHora;
        this.#status = status;
        this.#tipoAtendimento = tipoAtendimento;
        this.#enderecoEntrega = enderecoEntrega;
        this.#observacao = observacao;
        this.#valorTotal = valorTotal;
        this.#itens = itens;
        this.#pagamento = pagamento;
    }

    static toMap(row) {
        return new PedidoEntity({
            id: row.id_pedido,
            idCaixa: row.id_caixa,
            idUsuario: row.id_usuario,
            nomeUsuario: row.nome_usuario,
            idCliente: row.id_cliente,
            nomeCliente: row.nome_cliente,
            dataHora: row.data_hora,
            status: row.status,
            tipoAtendimento: row.tipo_atendimento,
            enderecoEntrega: row.endereco_entrega,
            observacao: row.observacao,
            valorTotal: Number(row.valor_total),
            itens: [],
            pagamento: null,
        });
    }

    validar() {
        return Number.isSafeInteger(this.#idUsuario) && this.#idUsuario > 0 && ['BALCAO', 'MESA', 'DELIVERY'].includes(this.#tipoAtendimento);
    }
}

