import UnidadeEntity from "../entities/unidadeEntity.js";
import Repository from "./repository.js";

export default class UnidadeRepository extends Repository {

    constructor() {
        super();
    }

    async listar() {
        let sql = "select * from unidade order by nome";
        let rows = await this.banco.ExecutaComando(sql);

        return rows.map(row => UnidadeEntity.toMap(row));
    }
}
