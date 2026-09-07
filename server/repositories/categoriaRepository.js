import CategoriaEntity from "../entities/categoriaEntity.js";
import Repository from "./repository.js";

export default class CategoriaRepository extends Repository {

    constructor() {
        super();
    }

    async listar() {
        let sql = "select * from categoria where ativo = true order by nome";
        let rows = await this.banco.ExecutaComando(sql);

        return rows.map(row => CategoriaEntity.toMap(row));
    }
}
