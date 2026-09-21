import CardapioEntity from "../entities/cardapioEntity.js";
import CardapioRepository from "../repositories/cardapioRepository.js";

export default class CardapioService{
    #repo;

    constructor(){
        this.#repo = new CardapioRepository();
    }

    async listar(){
        return await this.#repo.listar();
    }

    async criar({ nome }) {
      
        let entidade = new CardapioEntity(0,0, nome, true);

        await this.#repo.gravar(entidade);
        return entidade;
    }


    async excluir(id) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Cardapio não encontrado" };
        }

        try {
            return await this.#repo.excluir(id);
        } catch (erro) {
            throw erro;
        }
    }
}