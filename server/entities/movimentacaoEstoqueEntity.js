import Entity from "./entity.js";

export const TIPOS_MOVIMENTACAO = ['ENTRADA_COMPRA', 'PERDA', 'AJUSTE_ENTRADA', 'AJUSTE_SAIDA'];
export const QUANTIDADE_MAXIMA = 9999999.999;

export default class MovimentacaoEstoqueEntity extends Entity {
    #id;
    #idInsumo;
    #nomeInsumo;
    #siglaUnidade;
    #idUsuario;
    #nomeUsuario;
    #tipo;
    #quantidade;
    #motivo;
    #dataHora;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get idInsumo() { return this.#idInsumo; }
    set idInsumo(value) { this.#idInsumo = value; }
    get nomeInsumo() { return this.#nomeInsumo; }
    set nomeInsumo(value) { this.#nomeInsumo = value; }
    get siglaUnidade() { return this.#siglaUnidade; }
    set siglaUnidade(value) { this.#siglaUnidade = value; }
    get idUsuario() { return this.#idUsuario; }
    set idUsuario(value) { this.#idUsuario = value; }
    get nomeUsuario() { return this.#nomeUsuario; }
    set nomeUsuario(value) { this.#nomeUsuario = value; }
    get tipo() { return this.#tipo; }
    set tipo(value) { this.#tipo = value; }
    get quantidade() { return this.#quantidade; }
    set quantidade(value) { this.#quantidade = value; }
    get motivo() { return this.#motivo; }
    set motivo(value) { this.#motivo = value; }
    get dataHora() { return this.#dataHora; }
    set dataHora(value) { this.#dataHora = value; }

    constructor(id, idInsumo, idUsuario, tipo, quantidade, motivo, dataHora, nomeInsumo, siglaUnidade, nomeUsuario) {
        super();
        this.#id = id;
        this.#idInsumo = idInsumo;
        this.#idUsuario = idUsuario;
        this.#tipo = tipo;
        this.#quantidade = quantidade;
        this.#motivo = motivo ?? null;
        this.#dataHora = dataHora;
        this.#nomeInsumo = nomeInsumo;
        this.#siglaUnidade = siglaUnidade;
        this.#nomeUsuario = nomeUsuario;
    }

    static toMap(row) {
        return new MovimentacaoEstoqueEntity(row.id_movimentacao, row.id_insumo, row.id_usuario,
            row.tipo, Number(row.quantidade), row.motivo, row.data_hora, row.nome_insumo,
            row.sigla_unidade, row.nome_usuario);
    }

    static validarQuantidade(quantidade) {
        return Number.isFinite(quantidade) && quantidade > 0 && quantidade <= QUANTIDADE_MAXIMA
            && Math.round(quantidade * 1000) / 1000 === quantidade;
    }

    validar() {
        if (!Number.isSafeInteger(this.#idInsumo) || this.#idInsumo <= 0) return false;
        if (!Number.isSafeInteger(this.#idUsuario) || this.#idUsuario <= 0) return false;
        if (!TIPOS_MOVIMENTACAO.includes(this.#tipo)) return false;
        if (!MovimentacaoEstoqueEntity.validarQuantidade(this.#quantidade)) return false;
        if (this.#motivo !== null && (typeof this.#motivo !== 'string' || this.#motivo.length > 255)) return false;
        return this.#tipo === 'ENTRADA_COMPRA' || (typeof this.#motivo === 'string' && this.#motivo.trim().length >= 3);
    }
}
