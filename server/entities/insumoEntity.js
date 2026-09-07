import Entity from "./entity.js";

export const CLASSIFICACOES_VALIDAS = ["INSUMO", "VENDA_DIRETA"];

export default class InsumoEntity extends Entity {

    #id;
    #nome;
    #idCategoria;
    #idUnidade;
    #classificacao;
    #precoCusto;
    #precoVenda;
    #estoqueMinimo;
    #ativo;
    #criadoEm;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }

    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }

    get idCategoria() { return this.#idCategoria; }
    set idCategoria(value) { this.#idCategoria = value; }

    get idUnidade() { return this.#idUnidade; }
    set idUnidade(value) { this.#idUnidade = value; }

    get classificacao() { return this.#classificacao; }
    set classificacao(value) { this.#classificacao = value; }

    get precoCusto() { return this.#precoCusto; }
    set precoCusto(value) { this.#precoCusto = value; }

    get precoVenda() { return this.#precoVenda; }
    set precoVenda(value) { this.#precoVenda = value; }

    get estoqueMinimo() { return this.#estoqueMinimo; }
    set estoqueMinimo(value) { this.#estoqueMinimo = value; }

    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }

    get criadoEm() { return this.#criadoEm; }
    set criadoEm(value) { this.#criadoEm = value; }

    constructor(id, nome, idCategoria, idUnidade, classificacao, precoCusto, precoVenda, estoqueMinimo, ativo, criadoEm) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#idCategoria = idCategoria;
        this.#idUnidade = idUnidade;
        this.#classificacao = classificacao ?? "INSUMO";
        this.#precoCusto = precoCusto ?? 0;
        this.#precoVenda = precoVenda ?? 0;
        this.#estoqueMinimo = estoqueMinimo ?? 0;
        this.#ativo = ativo;
        this.#criadoEm = criadoEm;
    }

    // Mapeia uma linha da tabela `insumo` pra Entity
    static toMap(row) {
        return new InsumoEntity(
            row["id_insumo"],
            row["nome"],
            row["id_categoria"],
            row["id_unidade"],
            row["classificacao"],
            row["preco_custo"],
            row["preco_venda"],
            row["estoque_minimo"],
            row["ativo"],
            row["criado_em"]
        );
    }

    validar() {
        if (!this.#nome || this.#nome.trim().length < 2) return false;
        if (!this.#idCategoria) return false;
        if (!this.#idUnidade) return false;
        if (!CLASSIFICACOES_VALIDAS.includes(this.#classificacao)) return false;
        if (this.#precoCusto < 0 || this.#precoVenda < 0) return false;
        if (this.#estoqueMinimo < 0) return false;
        return true;
    }
}
