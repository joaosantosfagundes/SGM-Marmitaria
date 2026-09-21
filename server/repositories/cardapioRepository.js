import CardapioEntity from "../entities/cardapioEntity.js";
import Repository from "./repository.js";

export default class CardapioRepository extends Repository{

    constructor(){
        super();
    }

    async listar(){
        let sql = "select * from cardapio_item order by nome"
    }

    async gravar(entidade) {
        let sql = `insert into cardapio_item (nome, disponivel)
                    values (?, ?, ?, ?)`;
        let valores = [entidade.nome, entidade.disponivel];

        let id = await this.banco.ExecutaComandoLastInserted(sql, valores);
        entidade.id = id;

        return true;
    }

      async excluir(id) {
        let sql = "delete from cardapio_item where id_cardapio = ?";
        return await this.banco.ExecutaComandoNonQuery(sql, [id]);
    }
  
}