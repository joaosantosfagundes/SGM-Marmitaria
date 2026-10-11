import Entity from "./entity.js";

export default class CaixaEntity extends Entity {
    #id;
    #idUsuarioAbertura;
    #nomeUsuarioAbertura;
    #idUsuarioFechamento;
    #dataAbertura;
    #dataFechamento;
    #valorAbertura;
    #valorFechamento;
    #status;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }
    get idUsuarioAbertura() { return this.#idUsuarioAbertura; }
    set idUsuarioAbertura(value) { this.#idUsuarioAbertura = value; }
    get nomeUsuarioAbertura() { return this.#nomeUsuarioAbertura; }
    set nomeUsuarioAbertura(value) { this.#nomeUsuarioAbertura = value; }
    get idUsuarioFechamento() { return this.#idUsuarioFechamento; }
    set idUsuarioFechamento(value) { this.#idUsuarioFechamento = value; }
    get dataAbertura() { return this.#dataAbertura; }
    set dataAbertura(value) { this.#dataAbertura = value; }
    get dataFechamento() { return this.#dataFechamento; }
    set dataFechamento(value) { this.#dataFechamento = value; }
    get valorAbertura() { return this.#valorAbertura; }
    set valorAbertura(value) { this.#valorAbertura = value; }
    get valorFechamento() { return this.#valorFechamento; }
    set valorFechamento(value) { this.#valorFechamento = value; }
    get status() { return this.#status; }
    set status(value) { this.#status = value; }

    constructor(id, idUsuarioAbertura, valorAbertura, status = "ABERTO", nomeUsuarioAbertura,
        dataAbertura, idUsuarioFechamento, dataFechamento, valorFechamento) {
        super();
        this.#id = id;
        this.#idUsuarioAbertura = idUsuarioAbertura;
        this.#nomeUsuarioAbertura = nomeUsuarioAbertura;
        this.#dataAbertura = dataAbertura;
        this.#valorAbertura = valorAbertura;
        this.#status = status;
        this.#idUsuarioFechamento = idUsuarioFechamento ?? null;
        this.#dataFechamento = dataFechamento ?? null;
        this.#valorFechamento = valorFechamento ?? null;
    }

    static toMap(row) {
        return new CaixaEntity(row.id_caixa, row.id_usuario_abertura, Number(row.valor_abertura),
            row.status, row.nome_usuario_abertura, row.data_abertura, row.id_usuario_fechamento,
            row.data_fechamento, row.valor_fechamento == null ? null : Number(row.valor_fechamento));
    }

    validar() {
        if (!Number.isSafeInteger(this.#idUsuarioAbertura) || this.#idUsuarioAbertura <= 0) return false;
        if (!Number.isFinite(this.#valorAbertura) || this.#valorAbertura < 0 || this.#valorAbertura > 99999999.99) return false;
        if (Math.round(this.#valorAbertura * 100) / 100 !== this.#valorAbertura) return false;
        return this.#status === "ABERTO" || this.#status === "FECHADO";
    }
}
