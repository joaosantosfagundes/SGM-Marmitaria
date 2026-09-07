import CategoriaRepository from "../repositories/categoriaRepository.js";

export default class CategoriaController {

    #repo;

    constructor() {
        this.#repo = new CategoriaRepository();
    }

    async listar(req, res) {
        try {
            let categorias = await this.#repo.listar();
            return res.status(200).json(categorias);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }
}
