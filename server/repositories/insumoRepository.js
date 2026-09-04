import InsumoEntity from "../entities/insumoEntity.js";
import Repository from "./repository.js";

export default class InsumoRepository extends Repository {

    constructor() {
        super();
    }

    // Traz o insumo puro (sem join) — usado internamente e nas gravações/atualizações
    async listar() {
        let sql = "select * from insumo order by nome";
        let rows = await this.banco.ExecutaComando(sql);

        return rows.map(row => InsumoEntity.toMap(row));
    }

    // Versão com JOIN pra exibir na tela (nome da categoria e sigla da unidade),
    // sem precisar o front fazer 3 requisições separadas.
    async listarComDetalhes() {
        let sql = `
            select i.*, c.nome as nome_categoria, u.nome as nome_unidade, u.sigla as sigla_unidade
            from insumo i
            inner join categoria c on c.id_categoria = i.id_categoria
            inner join unidade u on u.id_unidade = i.id_unidade
            order by i.nome
        `;
        let rows = await this.banco.ExecutaComando(sql);

        return rows.map(row => ({
            ...InsumoEntity.toMap(row).toJSON(),
            nomeCategoria: row["nome_categoria"],
            nomeUnidade: row["nome_unidade"],
            siglaUnidade: row["sigla_unidade"],
        }));
    }

    async gravar(entidade) {
        let sql = `insert into insumo
                    (nome, id_categoria, id_unidade, classificacao, preco_custo, preco_venda, estoque_minimo, ativo)
                    values (?, ?, ?, ?, ?, ?, ?, ?)`;
        let valores = [
            entidade.nome,
            entidade.idCategoria,
            entidade.idUnidade,
            entidade.classificacao,
            entidade.precoCusto,
            entidade.precoVenda,
            entidade.estoqueMinimo,
            entidade.ativo,
        ];

        let id = await this.banco.ExecutaComandoLastInserted(sql, valores);
        entidade.id = id;

        return true;
    }

    async atualizar(entidade) {
        let sql = `update insumo set
                    nome = ?, id_categoria = ?, id_unidade = ?, classificacao = ?,
                    preco_custo = ?, preco_venda = ?, estoque_minimo = ?, ativo = ?
                    where id_insumo = ?`;
        let valores = [
            entidade.nome,
            entidade.idCategoria,
            entidade.idUnidade,
            entidade.classificacao,
            entidade.precoCusto,
            entidade.precoVenda,
            entidade.estoqueMinimo,
            entidade.ativo,
            entidade.id,
        ];

        return await this.banco.ExecutaComandoNonQuery(sql, valores);
    }

    async obter(id) {
        let sql = "select * from insumo where id_insumo = ?";
        let rows = await this.banco.ExecutaComando(sql, [id]);

        if (rows.length > 0) return InsumoEntity.toMap(rows[0]);
        return null;
    }

    async obterPorNome(nome) {
        let sql = "select * from insumo where nome = ?";
        let rows = await this.banco.ExecutaComando(sql, [nome]);

        if (rows.length > 0) return InsumoEntity.toMap(rows[0]);
        return null;
    }

    async inativar(id) {
        let sql = "update insumo set ativo = false where id_insumo = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [id]);
    }

    // Ajudantes pra validar as FKs antes de gravar (o service que deve chamar isso)
    async categoriaExiste(idCategoria) {
        let sql = "select 1 from categoria where id_categoria = ? and ativo = true";
        let rows = await this.banco.ExecutaComando(sql, [idCategoria]);
        return rows.length > 0;
    }

    async unidadeExiste(idUnidade) {
        let sql = "select 1 from unidade where id_unidade = ?";
        let rows = await this.banco.ExecutaComando(sql, [idUnidade]);
        return rows.length > 0;
    }
}