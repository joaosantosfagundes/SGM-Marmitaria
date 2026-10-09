import AdicionalEntity from "../entities/adicionalEntity.js";
import Repository from "./repository.js";

export default class AdicionalRepository extends Repository {
    async listar() {
        let rows = await this.banco.ExecutaComando("select * from adicional order by nome");
        return rows.map(row => AdicionalEntity.toMap(row));
    }

    async obter(id) {
        let rows = await this.banco.ExecutaComando("select * from adicional where id_adicional = ?", [id]);
        return rows.length ? AdicionalEntity.toMap(rows[0]) : null;
    }

    async obterAtivoPorNome(nome, ignorarId = 0) {
        let rows = await this.banco.ExecutaComando(
            "select * from adicional where ativo = true and lower(trim(nome)) = lower(trim(?)) and id_adicional <> ?",
            [nome, ignorarId]
        );
        return rows.length ? AdicionalEntity.toMap(rows[0]) : null;
    }

    async gravar(entidade) {
        entidade.id = await this.banco.ExecutaComandoLastInserted(
            "insert into adicional (nome, preco, ativo, id_insumo, quantidade_consumida) values (?, ?, ?, ?, ?)",
            [entidade.nome, entidade.preco, entidade.ativo, entidade.idInsumo, entidade.quantidadeConsumida]
        );
        return true;
    }

    async atualizar(entidade) {
        return this.banco.ExecutaComandoNonQuery(
            "update adicional set nome = ?, preco = ?, ativo = ?, id_insumo = ?, quantidade_consumida = ? where id_adicional = ?",
            [entidade.nome, entidade.preco, entidade.ativo, entidade.idInsumo, entidade.quantidadeConsumida, entidade.id]
        );
    }

    async inativar(id) {
        return this.banco.ExecutaComandoNonQuery("update adicional set ativo = false where id_adicional = ?", [id]);
    }

    async excluir(id) {
        return this.banco.ExecutaComandoNonQuery("delete from adicional where id_adicional = ?", [id]);
    }
}
