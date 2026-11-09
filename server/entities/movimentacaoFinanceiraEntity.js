import Entity from './entity.js';
import { validarDinheiro, validarId } from '../utils/pedidoUtils.js';

export default class MovimentacaoFinanceiraEntity extends Entity {
    #id; #idUsuario; #nomeUsuario; #idPedido; #idMovimentacaoEstoque;
    #idCaixa;
    #tipo; #categoria; #descricao; #valor; #dataHora; #recorrente; #quantidadeMeses;

    get id() { return this.#id; }
    set id(valor) { this.#id = valor; }
    get idUsuario() { return this.#idUsuario; }
    get nomeUsuario() { return this.#nomeUsuario; }
    get idPedido() { return this.#idPedido; }
    get idMovimentacaoEstoque() { return this.#idMovimentacaoEstoque; }
    get idCaixa() { return this.#idCaixa; }
    get origem() { return this.#idCaixa !== null ? 'CAIXA' : this.#idMovimentacaoEstoque !== null ? 'ESTOQUE' : 'MANUAL'; }
    get tipo() { return this.#tipo; }
    get categoria() { return this.#categoria; }
    get descricao() { return this.#descricao; }
    get valor() { return this.#valor; }
    get dataHora() { return this.#dataHora; }
    get recorrente() { return this.#recorrente; }
    get quantidadeMeses() { return this.#quantidadeMeses; }

    constructor({ id = null, idUsuario = null, nomeUsuario = null, idPedido = null, idMovimentacaoEstoque = null,
        idCaixa = null,
        tipo, categoria, descricao = null, valor, dataHora, recorrente = false, quantidadeMeses = null } = {}) {
        super();
        this.#id = id; this.#idUsuario = idUsuario; this.#nomeUsuario = nomeUsuario;
        this.#idPedido = idPedido; this.#idMovimentacaoEstoque = idMovimentacaoEstoque;
        this.#idCaixa = idCaixa;
        this.#tipo = tipo; this.#categoria = typeof categoria === 'string' ? categoria.trim() : categoria;
        this.#descricao = typeof descricao === 'string' ? descricao.trim() || null : descricao;
        this.#valor = valor; this.#dataHora = dataHora;
        this.#recorrente = recorrente; this.#quantidadeMeses = quantidadeMeses;
    }

    static toMap(row) {
        return new MovimentacaoFinanceiraEntity({ id: row.id_movimentacao_financeira,
            idUsuario: row.id_usuario, nomeUsuario: row.nome_usuario, idPedido: row.id_pedido,
            idMovimentacaoEstoque: row.id_movimentacao_estoque, idCaixa: row.id_caixa, tipo: row.tipo, categoria: row.categoria,
            descricao: row.descricao, valor: Number(row.valor), dataHora: row.data_hora,
            recorrente: Boolean(row.recorrente), quantidadeMeses: row.quantidade_meses == null ? null : Number(row.quantidade_meses) });
    }

    static toMapResumo(row) {
        return { grupo: row.grupo, chave: row.chave, tipo: row.tipo, valor: Number(row.valor) };
    }

    static validarValor(valor) { return validarDinheiro(valor) && valor > 0; }

    static normalizarDataHora(valor) {
        if (typeof valor !== 'string') return null;
        let partes = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(valor);
        if (!partes) return null;
        let [ano, mes, dia, hora, minuto, segundo] = partes.slice(1).map(parte => Number(parte ?? 0));
        let data = new Date(Date.UTC(ano, mes - 1, dia));
        if (ano < 1000 || data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia
            || hora > 23 || minuto > 59 || segundo > 59) return null;
        return `${partes[1]}-${partes[2]}-${partes[3]} ${partes[4]}:${partes[5]}:${partes[6] ?? '00'}`;
    }

    validar() {
        return validarId(this.#idUsuario) && ['ENTRADA', 'SAIDA'].includes(this.#tipo)
            && typeof this.#categoria === 'string' && this.#categoria.length > 0 && this.#categoria.length <= 100
            && (this.#descricao === null || (typeof this.#descricao === 'string' && this.#descricao.length <= 255))
            && MovimentacaoFinanceiraEntity.validarValor(this.#valor)
            && MovimentacaoFinanceiraEntity.normalizarDataHora(this.#dataHora) !== null
            && typeof this.#recorrente === 'boolean'
            && (this.#recorrente ? Number.isInteger(this.#quantidadeMeses) && this.#quantidadeMeses >= 2 && this.#quantidadeMeses <= 2147483647 : this.#quantidadeMeses === null)
            && (this.#idMovimentacaoEstoque === null || validarId(this.#idMovimentacaoEstoque));
    }
}
