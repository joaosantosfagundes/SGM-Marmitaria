import AdicionalEntity from "../entities/adicionalEntity.js";
import Repository from "./repository.js";

export default class AdicionalRepository extends Repository {
    async listar() {
        let rows = await this.banco.ExecutaComando("select id_adicional, nome, preco, ativo from adicional order by nome");
        return rows.map(row => AdicionalEntity.toMap(row));
    }

    async obter(id, consultar) {
        let executar = consultar ?? this.banco.ExecutaComando.bind(this.banco);
        let rows = await executar("select id_adicional, nome, preco, ativo from adicional where id_adicional = ?" + (consultar ? " for share" : ""), [id]);
        return rows.length ? AdicionalEntity.toMap(rows[0]) : null;
    }

    async obterAtivoPorNome(nome, ignorarId = 0) {
        let rows = await this.banco.ExecutaComando(
            "select id_adicional, nome, preco, ativo from adicional where ativo = true and lower(trim(nome)) = lower(trim(?)) and id_adicional <> ?",
            [nome, ignorarId]
        );
        return rows.length ? AdicionalEntity.toMap(rows[0]) : null;
    }

    async gravar(entidade) {
        entidade.id = await this.banco.ExecutaComandoLastInserted(
            "insert into adicional (nome, preco, ativo) values (?, ?, ?)",
            [entidade.nome, entidade.preco, entidade.ativo]
        );
        return true;
    }

    async atualizar(entidade) {
        return this.banco.ExecutaComandoNonQuery(
            "update adicional set nome = ?, preco = ?, ativo = ? where id_adicional = ?",
            [entidade.nome, entidade.preco, entidade.ativo, entidade.id]
        );
    }

    async inativar(id) {
        return this.banco.ExecutaComandoNonQuery("update adicional set ativo = false where id_adicional = ?", [id]);
    }

    async excluir(id) {
        return this.banco.ExecutaComandoNonQuery("delete from adicional where id_adicional = ?", [id]);
    }
}
