import ProdutoEntity from "../entities/produtoEntity.js";
import Repository from "./repository.js";

export default class ProdutoRepository extends Repository {

    constructor() {
        super();
    }

    async listar() {
        let sql = "select * from produto order by nome";
        let rows = await this.banco.ExecutaComando(sql);

        return rows.map(row => ProdutoEntity.toMap(row));
    }

    async gravar(entidade) {
        let sql = `insert into produto (nome, descricao, preco_padrao, ativo)
                    values (?, ?, ?, ?)`;
        let valores = [entidade.nome, entidade.descricao, entidade.precoPadrao, entidade.ativo];

        let id = await this.banco.ExecutaComandoLastInserted(sql, valores);
        entidade.id = id;

        return true;
    }

    async atualizar(entidade) {
        let sql = `update produto set nome = ?, descricao = ?, preco_padrao = ?, ativo = ?
                    where id_produto = ?`;
        let valores = [entidade.nome, entidade.descricao, entidade.precoPadrao, entidade.ativo, entidade.id];

        return await this.banco.ExecutaComandoNonQuery(sql, valores);
    }

    async obter(id) {
        let sql = "select * from produto where id_produto = ?";
        let rows = await this.banco.ExecutaComando(sql, [id]);

        if (rows.length > 0) return ProdutoEntity.toMap(rows[0]);
        return null;
    }

    async obterPorNome(nome) {
        let sql = "select * from produto where nome = ?";
        let rows = await this.banco.ExecutaComando(sql, [nome]);

        if (rows.length > 0) return ProdutoEntity.toMap(rows[0]);
        return null;
    }

    async inativar(id) {
        let sql = "update produto set ativo = false where id_produto = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [id]);
    }
}