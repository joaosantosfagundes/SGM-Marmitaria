import Entity from "./entity.js";

export default class ResumoCaixaEntity extends Entity {
    #idCaixa;
    #status;
    #valorAbertura;
    #totalDinheiro;
    #totalPix;
    #totalDebito;
    #totalCredito;
    #totalFiado;
    #totalRecebido;
    #totalVendido;
    #saldoEsperadoDinheiro;
    #valorFechamento;
    #diferenca;
    #quantidadePagamentos;

    get idCaixa() { return this.#idCaixa; }
    get status() { return this.#status; }
    get valorAbertura() { return this.#valorAbertura; }
    get totalDinheiro() { return this.#totalDinheiro; }
    get totalPix() { return this.#totalPix; }
    get totalDebito() { return this.#totalDebito; }
    get totalCredito() { return this.#totalCredito; }
    get totalFiado() { return this.#totalFiado; }
    get totalRecebido() { return this.#totalRecebido; }
    set totalRecebido(value) { this.#totalRecebido = value; }
    get totalVendido() { return this.#totalVendido; }
    set totalVendido(value) { this.#totalVendido = value; }
    get saldoEsperadoDinheiro() { return this.#saldoEsperadoDinheiro; }
    set saldoEsperadoDinheiro(value) { this.#saldoEsperadoDinheiro = value; }
    get valorFechamento() { return this.#valorFechamento; }
    get diferenca() { return this.#diferenca; }
    set diferenca(value) { this.#diferenca = value; }
    get quantidadePagamentos() { return this.#quantidadePagamentos; }

    constructor(row) {
        super();
        this.#idCaixa = row.id_caixa;
        this.#status = row.status;
        this.#valorAbertura = Number(row.valor_abertura);
        this.#totalDinheiro = Number(row.total_dinheiro);
        this.#totalPix = Number(row.total_pix);
        this.#totalDebito = Number(row.total_debito);
        this.#totalCredito = Number(row.total_credito);
        this.#totalFiado = Number(row.total_fiado);
        this.#valorFechamento = row.valor_fechamento == null ? null : Number(row.valor_fechamento);
        this.#totalRecebido = 0;
        this.#totalVendido = 0;
        this.#saldoEsperadoDinheiro = 0;
        this.#diferenca = null;
        this.#quantidadePagamentos = {
            dinheiro: Number(row.quantidade_dinheiro), pix: Number(row.quantidade_pix),
            debito: Number(row.quantidade_debito), credito: Number(row.quantidade_credito), fiado: Number(row.quantidade_fiado),
        };
    }

    static toMap(row) {
        return new ResumoCaixaEntity(row);
    }

    validar() {
        return Number.isSafeInteger(this.#idCaixa) && this.#idCaixa > 0 && ['ABERTO', 'FECHADO'].includes(this.#status);
    }
}
