import Entity from "./entity.js";

export default class ItemPedidoEntity extends Entity {
    #id;
    #idProduto;
    #nomeProduto;
    #quantidade;
    #precoUnitario;
    #subtotal;
    #opcaoMistura;
    #observacao;
    #adicionais;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get idProduto() { return this.#idProduto; }
    set idProduto(value) { this.#idProduto = value; }
    get nomeProduto() { return this.#nomeProduto; }
    set nomeProduto(value) { this.#nomeProduto = value; }
    get quantidade() { return this.#quantidade; }
    set quantidade(value) { this.#quantidade = value; }
    get precoUnitario() { return this.#precoUnitario; }
    set precoUnitario(value) { this.#precoUnitario = value; }
    get subtotal() { return this.#subtotal; }
    set subtotal(value) { this.#subtotal = value; }
    get opcaoMistura() { return this.#opcaoMistura; }
    set opcaoMistura(value) { this.#opcaoMistura = value; }
    get observacao() { return this.#observacao; }
    set observacao(value) { this.#observacao = value; }
    get adicionais() { return this.#adicionais; }
    set adicionais(value) { this.#adicionais = value; }

    constructor({
        id = null, idProduto = null, nomeProduto = null, quantidade = null,
        precoUnitario = null, subtotal = null, opcaoMistura = null,
        observacao = null, adicionais = [],
    } = {}) {
        super();
        this.#id = id;
        this.#idProduto = idProduto;
        this.#nomeProduto = nomeProduto;
        this.#quantidade = quantidade;
        this.#precoUnitario = precoUnitario;
        this.#subtotal = subtotal;
        this.#opcaoMistura = opcaoMistura;
        this.#observacao = observacao;
        this.#adicionais = adicionais;
    }

    static toMap(row) {
        return new ItemPedidoEntity({
            id: row.id_item_pedido,
            idProduto: row.id_produto,
            nomeProduto: row.nome_produto,
            quantidade: row.quantidade,
            precoUnitario: Number(row.preco_unitario),
            subtotal: Number(row.subtotal),
            opcaoMistura: row.opcao_mistura,
            observacao: row.observacao,
            adicionais: [],
        });
    }

    validar() {
        return Number.isSafeInteger(this.#idProduto) && this.#idProduto > 0 && Number.isInteger(this.#quantidade) && this.#quantidade >= 1 && this.#quantidade <= 99;
    }
}

