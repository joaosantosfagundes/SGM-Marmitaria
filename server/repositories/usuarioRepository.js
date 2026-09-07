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

    // Esqueci minha senha

    async salvarTokenReset(id, tokenHash, expiraEm) {
        let sql = "update usuario set token_reset = ?, token_reset_expira = ? where id_usuario = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [tokenHash, expiraEm, id]);
    }

    async obterPorTokenResetValido(tokenHash) {
        let sql = `select * from usuario
                    where token_reset = ? and token_reset_expira > NOW()`;
        let rows = await this.banco.ExecutaComando(sql, [tokenHash]);

        if (rows.length > 0) return UsuarioEntity.toMap(rows[0]);
        return null;
    }

    async limparTokenReset(id) {
        let sql = "update usuario set token_reset = null, token_reset_expira = null where id_usuario = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [id]);
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

    // Usado só na inativação
    async inativar(id) {
        let sql = "update usuario set ativo = false where id_usuario = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [id]);
    }
}