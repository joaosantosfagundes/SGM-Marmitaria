import CaixaEntity from "../entities/caixaEntity.js";
import Repository from "./repository.js";

export default class CaixaRepository extends Repository {
    async listar() {
        let rows = await this.banco.ExecutaComando(
            `select c.*, u.nome as nome_usuario_abertura from caixa c
             inner join usuario u on u.id_usuario = c.id_usuario_abertura
             order by c.data_abertura desc, c.id_caixa desc limit 10`
        );
        return rows.map(row => CaixaEntity.toMap(row));
    }

    async obterAtual() {
        let rows = await this.banco.ExecutaComando(
            `select c.*, u.nome as nome_usuario_abertura from caixa c
             inner join usuario u on u.id_usuario = c.id_usuario_abertura
             where c.status = 'ABERTO' limit 1`
        );
        return rows.length ? CaixaEntity.toMap(rows[0]) : null;
    }

    async obter(id) {
        let rows = await this.banco.ExecutaComando(
            `select c.*, u.nome as nome_usuario_abertura from caixa c
             inner join usuario u on u.id_usuario = c.id_usuario_abertura where c.id_caixa = ?`, [id]
        );
        return rows.length ? CaixaEntity.toMap(rows[0]) : null;
    }

    async gravar(entidade) {
        entidade.id = await this.banco.ExecutaComandoLastInserted(
            "insert into caixa (id_usuario_abertura, valor_abertura) values (?, ?)",
            [entidade.idUsuarioAbertura, entidade.valorAbertura]
        );
        return true;
    }
}
