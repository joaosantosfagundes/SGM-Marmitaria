import ClienteEntity from "../entities/clienteEntity.js"
import Repository from "./repository.js";

export default class ClienteRepository extends Repository{

    constructor(){
        super();
    }
    
    async listar(){
        let sql = "select * from cliente order by nome"
        let rows = await this.banco.ExecutaComando(sql);

        return rows.map(row => ClienteEntity.toMap(row));
    }

    async gravar(entidade){
        let  sql = `insert into cliente (nome, telefone, ativo)
                    values (?, ?, ?)`;

        let valores = [entidade.nome, entidade.telefone, entidade.ativo];

        let id = await this.banco.ExecutaComandoLastInserted(sql,valores);
        entidade.id = id;

        return true;
    }

    async atualizar(entidade) {
        let sql = `update cliente set nome = ?, telefone = ?, ativo = ?
                where id_cliente = ?`;
        let valores = [entidade.nome, entidade.telefone, entidade.ativo, entidade.id];

        return await this.banco.ExecutaComandoNonQuery(sql, valores);
    }

    async obter(id) {
        let sql = "select * from cliente where id_cliente = ?";
        let rows = await this.banco.ExecutaComando(sql, [id]);
    
        if (rows.length > 0) return ClienteEntity.toMap(rows[0]);
        return null;
    }

    async obterPorTelefone(telefone) {
        let sql = "select * from cliente where telefone = ?";
        let rows = await this.banco.ExecutaComando(sql, [telefone]);
    
        if (rows.length > 0) return ClienteEntity.toMap(rows[0]);
        return null;
    }

    async inativar(id) {
        let sql = "update cliente set ativo = false where id_cliente = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [id]);
    }

}