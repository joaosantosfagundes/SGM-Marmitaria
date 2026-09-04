import UsuarioEntity from "../entities/usuarioEntity.js";
import Repository from "./repository.js";

export default class UsuarioRepository extends Repository {

    constructor() {
        super();
    }

    async listar() {
        let sql = "select * from usuario order by nome";
        let rows = await this.banco.ExecutaComando(sql);

        return rows.map(row => UsuarioEntity.toMap(row));
    }

    async gravar(entidade) {
        let sql = `insert into usuario (nome, email, senha, perfil, ativo)
                    values (?, ?, ?, ?, ?)`;
        let valores = [entidade.nome, entidade.email, entidade.senha, entidade.perfil, entidade.ativo];

        let id = await this.banco.ExecutaComandoLastInserted(sql, valores);
        entidade.id = id;

        return true;
    }

    async atualizar(entidade) {
        let sql = `update usuario set nome = ?, email = ?, perfil = ?, ativo = ?
                    where id_usuario = ?`;
        let valores = [entidade.nome, entidade.email, entidade.perfil, entidade.ativo, entidade.id];

        return await this.banco.ExecutaComandoNonQuery(sql, valores);
    }

    async atualizarSenha(id, senhaHash) {
        let sql = "update usuario set senha = ? where id_usuario = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [senhaHash, id]);
    }

    async obter(id) {
        let sql = "select * from usuario where id_usuario = ?";
        let rows = await this.banco.ExecutaComando(sql, [id]);

        if (rows.length > 0) return UsuarioEntity.toMap(rows[0]);
        return null;
    }

    async obterPorEmail(email) {
        let sql = "select * from usuario where email = ?";
        let rows = await this.banco.ExecutaComando(sql, [email]);

        if (rows.length > 0) return UsuarioEntity.toMap(rows[0]);
        return null;
    }

    // Usado só na inativação (RF_B1 não tem exclusão física de usuário, só ativo/inativo)
    async inativar(id) {
        let sql = "update usuario set ativo = false where id_usuario = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [id]);
    }
}
